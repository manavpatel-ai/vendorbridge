from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Any, List, Optional
from uuid import UUID
from datetime import date, datetime, timedelta
import io

from app.core.deps import get_db, get_current_user, require_role
from app.models.all_models import (
    Invoice, PurchaseOrder, PoLineItem, Vendor, User, UserRole, InvoiceStatus
)
from app.schemas.all_schemas import InvoiceCreate, InvoiceResponse
from app.services.numbering import next_number
from app.services.pdf_service import render_invoice_to_pdf
from app.services.email_service import send_invoice_email
from app.services.logging_service import write_activity

router = APIRouter()

@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def generate_invoice(
    invoice_in: InvoiceCreate,
    current_user: User = Depends(require_role("admin", "procurement_officer")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # 1. Load Purchase Order
    po_res = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.line_items), selectinload(PurchaseOrder.vendor))
        .filter(PurchaseOrder.id == invoice_in.po_id)
    )
    po = po_res.scalars().first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
        
    # Check if invoice already exists for this PO
    existing_res = await db.execute(select(Invoice).filter(Invoice.po_id == po.id))
    existing_inv = existing_res.scalars().first()
    if existing_inv:
        raise HTTPException(status_code=400, detail="An invoice has already been generated for this Purchase Order.")
        
    # 2. Generate sequential Invoice number
    inv_num = await next_number(db, "INV", "invoice")
    
    # 3. Create Invoice
    invoice_date = date.today()
    due_date = invoice_date + timedelta(days=30)
    
    invoice = Invoice(
        invoice_number=inv_num,
        po_id=po.id,
        invoice_date=invoice_date,
        due_date=due_date,
        subtotal=po.subtotal,
        cgst=po.cgst,
        sgst=po.sgst,
        igst=po.igst,
        grand_total=po.grand_total,
        status=InvoiceStatus.pending_payment
    )
    db.add(invoice)
    await db.flush() # get invoice.id
    
    # 4. Generate PDF automatically and save URL (relative path)
    # We will construct variables for Jinja2 template
    data = {
        "invoice": invoice,
        "po": po,
        "vendor": po.vendor,
        "buyer": {
            "org_name": po.buyer_org_name,
            "address": po.buyer_address,
            "gstin": po.buyer_gstin
        },
        "line_items": po.line_items
    }
    
    pdf_bytes = render_invoice_to_pdf(data)
    
    # Save PDF locally
    pdf_dir = "backend/uploads/invoices"
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_path = os.path.join(pdf_dir, f"{invoice.invoice_number}.pdf")
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)
        
    invoice.pdf_url = f"/uploads/invoices/{invoice.invoice_number}.pdf"
    db.add(invoice)
    
    # Audit log
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="invoice",
        entity_id=invoice.id,
        action="generated",
        description=f"Generated Invoice {invoice.invoice_number} (Total: ₹{invoice.grand_total:.2f}) for PO {po.po_number}"
    )
    
    await db.commit()
    
    # Reload invoice
    reload_res = await db.execute(select(Invoice).filter(Invoice.id == invoice.id))
    db_inv = reload_res.scalars().first()
    res = InvoiceResponse.model_validate(db_inv)
    res.po_number = po.po_number
    res.vendor_name = po.vendor.name
    return res

@router.get("/", response_model=List[InvoiceResponse])
async def list_invoices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Get invoices with PO and Vendor eager loaded
    query = (
        select(Invoice)
        .join(PurchaseOrder, Invoice.po_id == PurchaseOrder.id)
        .options(
            selectinload(Invoice.po).selectinload(PurchaseOrder.vendor)
        )
    )
    
    # Vendor restriction: only see own invoices (via PO.vendor_id)
    if current_user.role == UserRole.vendor:
        query = query.filter(PurchaseOrder.vendor_id == current_user.vendor_id)
        
    result = await db.execute(query.order_by(Invoice.created_at.desc()))
    invoices = result.scalars().all()
    
    res_list = []
    for inv in invoices:
        # Check overdue status dynamically: if status is pending_payment and due_date < today
        current_status = inv.status
        if current_status == InvoiceStatus.pending_payment and inv.due_date and inv.due_date < date.today():
            current_status = InvoiceStatus.overdue
            
        res = InvoiceResponse.model_validate(inv)
        res.status = current_status
        res.po_number = inv.po.po_number
        res.vendor_name = inv.po.vendor.name
        res_list.append(res)
        
    return res_list

@router.get("/{id}", response_model=InvoiceResponse)
async def get_invoice(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(Invoice)
        .join(PurchaseOrder, Invoice.po_id == PurchaseOrder.id)
        .options(selectinload(Invoice.po).selectinload(PurchaseOrder.vendor))
        .filter(Invoice.id == id)
    )
    inv = result.scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if current_user.role == UserRole.vendor and inv.po.vendor_id != current_user.vendor_id:
        raise HTTPException(status_code=403, detail="You do not have access to this invoice.")
        
    current_status = inv.status
    if current_status == InvoiceStatus.pending_payment and inv.due_date and inv.due_date < date.today():
        current_status = InvoiceStatus.overdue
        
    res = InvoiceResponse.model_validate(inv)
    res.status = current_status
    res.po_number = inv.po.po_number
    res.vendor_name = inv.po.vendor.name
    return res

@router.get("/{id}/pdf")
async def get_invoice_pdf(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # 1. Load Invoice, PO, Vendor, and line items
    result = await db.execute(
        select(Invoice)
        .join(PurchaseOrder, Invoice.po_id == PurchaseOrder.id)
        .options(
            selectinload(Invoice.po).selectinload(PurchaseOrder.vendor),
            selectinload(Invoice.po).selectinload(PurchaseOrder.line_items)
        )
        .filter(Invoice.id == id)
    )
    inv = result.scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if current_user.role == UserRole.vendor and inv.po.vendor_id != current_user.vendor_id:
        raise HTTPException(status_code=403, detail="You do not have access to this invoice.")
        
    # 2. Render PDF
    data = {
        "invoice": inv,
        "po": inv.po,
        "vendor": inv.po.vendor,
        "buyer": {
            "org_name": inv.po.buyer_org_name,
            "address": inv.po.buyer_address,
            "gstin": inv.po.buyer_gstin
        },
        "line_items": inv.po.line_items
    }
    
    pdf_bytes = render_invoice_to_pdf(data)
    
    # Return PDF file stream
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=Invoice_{inv.invoice_number}.pdf"}
    )

@router.post("/{id}/email")
async def email_invoice(
    id: UUID,
    to_email: Optional[str] = Query(None, description="Optional override recipient email"),
    current_user: User = Depends(require_role("admin", "procurement_officer")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # 1. Load Invoice, PO, Vendor
    result = await db.execute(
        select(Invoice)
        .join(PurchaseOrder, Invoice.po_id == PurchaseOrder.id)
        .options(
            selectinload(Invoice.po).selectinload(PurchaseOrder.vendor),
            selectinload(Invoice.po).selectinload(PurchaseOrder.line_items)
        )
        .filter(Invoice.id == id)
    )
    inv = result.scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    vendor = inv.po.vendor
    recipient_email = to_email or vendor.contact_email
    
    if not recipient_email:
        raise HTTPException(
            status_code=400,
            detail="No contact email available for this vendor. Please provide an email address in query parameter."
        )
        
    # 2. Render PDF bytes
    data = {
        "invoice": inv,
        "po": inv.po,
        "vendor": vendor,
        "buyer": {
            "org_name": inv.po.buyer_org_name,
            "address": inv.po.buyer_address,
            "gstin": inv.po.buyer_gstin
        },
        "line_items": inv.po.line_items
    }
    pdf_bytes = render_invoice_to_pdf(data)
    
    # 3. Email dispatch
    success = await send_invoice_email(
        to_email=recipient_email,
        invoice_number=inv.invoice_number,
        pdf_bytes=pdf_bytes,
        pdf_filename=f"Invoice_{inv.invoice_number}.pdf"
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to dispatch email via SMTP server.")
        
    # 4. Stamp emailed_at
    inv.emailed_at = datetime.utcnow()
    db.add(inv)
    
    # Audit log
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="invoice",
        entity_id=inv.id,
        action="emailed",
        description=f"Emailed Invoice {inv.invoice_number} to {recipient_email}"
    )
    
    await db.commit()
    
    return {"message": f"Invoice emailed successfully to {recipient_email}."}

@router.patch("/{id}/status", response_model=InvoiceResponse)
async def update_invoice_status(
    id: UUID,
    status: InvoiceStatus = Query(..., description="New status ('paid' or 'pending_payment')"),
    current_user: User = Depends(require_role("admin", "procurement_officer")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(Invoice)
        .join(PurchaseOrder, Invoice.po_id == PurchaseOrder.id)
        .options(selectinload(Invoice.po).selectinload(PurchaseOrder.vendor))
        .filter(Invoice.id == id)
    )
    inv = result.scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if status == InvoiceStatus.paid:
        inv.status = InvoiceStatus.paid
        inv.paid_at = datetime.utcnow()
    else:
        inv.status = InvoiceStatus.pending_payment
        inv.paid_at = None
        
    db.add(inv)
    
    # Audit log
    action_desc = "marked paid" if status == InvoiceStatus.paid else "marked unpaid"
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="invoice",
        entity_id=inv.id,
        action="paid" if status == InvoiceStatus.paid else "marked_unpaid",
        description=f"Invoice {inv.invoice_number} {action_desc}."
    )
    
    await db.commit()
    
    res = InvoiceResponse.model_validate(inv)
    res.po_number = inv.po.po_number
    res.vendor_name = inv.po.vendor.name
    return res
