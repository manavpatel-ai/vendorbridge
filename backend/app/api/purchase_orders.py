from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Any, List, Optional
from uuid import UUID
from datetime import date

from app.core.deps import get_db, get_current_user, require_role
from app.models.all_models import (
    PurchaseOrder, PoLineItem, Rfq, RfqStatus, Quotation, QuotationStatus, 
    Vendor, User, UserRole, OrganizationSetting
)
from app.schemas.all_schemas import PurchaseOrderCreate, PurchaseOrderResponse
from app.services.numbering import next_number
from app.services.tax import split_gst
from app.services.logging_service import write_activity

router = APIRouter()

@router.post("/", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def generate_purchase_order(
    po_in: PurchaseOrderCreate,
    current_user: User = Depends(require_role("admin", "procurement_officer")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # 1. Load RFQ and check status
    rfq_res = await db.execute(
        select(Rfq).filter(Rfq.id == po_in.rfq_id)
    )
    rfq = rfq_res.scalars().first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    if rfq.status != RfqStatus.approved:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate Purchase Order. RFQ is in '{rfq.status.value}' status, but must be 'approved'."
        )
        
    # 2. Get the selected quotation for this RFQ
    q_res = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.line_items), selectinload(Quotation.vendor))
        .filter(Quotation.rfq_id == po_in.rfq_id, Quotation.status == QuotationStatus.selected)
    )
    quotation = q_res.unique().scalars().first()
    if not quotation:
        raise HTTPException(
            status_code=400,
            detail="No selected quotation found for this RFQ. Please select and approve a quotation first."
        )
        
    # 3. Get organization settings for buyer details
    settings_res = await db.execute(select(OrganizationSetting).limit(1))
    org_settings = settings_res.scalars().first()
    if not org_settings:
        # Create a fallback setting if not present
        org_settings = OrganizationSetting(
            org_name="Your Organization",
            address="Corporate Head Office, India",
            gstin="29AAAAA1111A1Z1"
        )
        db.add(org_settings)
        await db.flush()
        
    # 4. Generate sequential PO number
    po_num = await next_number(db, "PO", "purchase_order")
    
    # 5. Split GST (Default to Intra-State split: 9% CGST, 9% SGST)
    tax_split = split_gst(quotation.subtotal, float(quotation.tax_percent), intra_state=True)
    
    # 6. Create Purchase Order
    po = PurchaseOrder(
        po_number=po_num,
        rfq_id=rfq.id,
        quotation_id=quotation.id,
        vendor_id=quotation.vendor_id,
        buyer_org_name=org_settings.org_name,
        buyer_address=org_settings.address,
        buyer_gstin=org_settings.gstin,
        po_date=date.today(),
        subtotal=quotation.subtotal,
        cgst=tax_split["cgst"],
        sgst=tax_split["sgst"],
        igst=tax_split["igst"],
        grand_total=tax_split["grand_total"],
        status="generated",
        created_by=current_user.id
    )
    db.add(po)
    await db.flush() # get po.id
    
    # 7. Copy line items from Quotation
    for item in quotation.line_items:
        po_item = PoLineItem(
            po_id=po.id,
            item_name=item.item_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=item.quantity * item.unit_price
        )
        db.add(po_item)
        
    # 8. Update RFQ Status to po_generated
    rfq.status = RfqStatus.po_generated
    db.add(rfq)
    
    # Audit log
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="purchase_order",
        entity_id=po.id,
        action="generated",
        description=f"Generated Purchase Order {po.po_number} (Total: ₹{po.grand_total:.2f}) from RFQ {rfq.rfq_number}"
    )
    
    await db.commit()
    
    # Reload PO with relationships
    reload_res = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.line_items), selectinload(PurchaseOrder.vendor))
        .filter(PurchaseOrder.id == po.id)
    )
    db_po = reload_res.unique().scalars().first()
    res = PurchaseOrderResponse.model_validate(db_po)
    res.vendor_name = db_po.vendor.name
    return res

@router.get("/", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    query = select(PurchaseOrder).options(
        selectinload(PurchaseOrder.line_items),
        selectinload(PurchaseOrder.vendor)
    )
    
    # Vendor restriction: only see own POs
    if current_user.role == UserRole.vendor:
        query = query.filter(PurchaseOrder.vendor_id == current_user.vendor_id)
        
    result = await db.execute(query.order_by(PurchaseOrder.created_at.desc()))
    pos = result.unique().scalars().all()
    
    res_list = []
    for po in pos:
        res = PurchaseOrderResponse.model_validate(po)
        res.vendor_name = po.vendor.name
        res_list.append(res)
        
    return res_list

@router.get("/{id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.line_items), selectinload(PurchaseOrder.vendor))
        .filter(PurchaseOrder.id == id)
    )
    po = result.unique().scalars().first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
        
    if current_user.role == UserRole.vendor and po.vendor_id != current_user.vendor_id:
        raise HTTPException(status_code=403, detail="You do not have access to this Purchase Order.")
        
    res = PurchaseOrderResponse.model_validate(po)
    res.vendor_name = po.vendor.name
    return res
