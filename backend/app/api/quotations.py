from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime

from app.core.deps import get_db, get_current_user, require_role
from app.models.all_models import (
    Quotation, QuotationLineItem, Rfq, RfqVendor, Vendor, User, UserRole, 
    RfqStatus, RfqVendorStatus, QuotationStatus, Approval, ApprovalStatus, Notification
)
from app.schemas.all_schemas import QuotationCreate, QuotationResponse, ApprovalCreate
from app.services.numbering import next_number
from app.services.logging_service import write_activity

router = APIRouter()

@router.get("/", response_model=List[QuotationResponse])
async def list_quotations(
    rfq_id: Optional[UUID] = Query(None),
    vendor_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    query = select(Quotation).options(
        selectinload(Quotation.line_items),
        selectinload(Quotation.vendor)
    )
    
    if rfq_id:
        query = query.filter(Quotation.rfq_id == rfq_id)
        
    # Vendor restriction: can only see their own quotations
    if current_user.role == UserRole.vendor:
        query = query.filter(Quotation.vendor_id == current_user.vendor_id)
    elif vendor_id:
        query = query.filter(Quotation.vendor_id == vendor_id)
        
    result = await db.execute(query.order_by(Quotation.created_at.desc()))
    quotations = result.scalars().all()
    
    # Map vendor names and ratings onto response objects
    res_list = []
    for q in quotations:
        item = QuotationResponse.model_validate(q)
        item.vendor_name = q.vendor.name
        item.vendor_rating = float(q.vendor.rating) if q.vendor.rating else 0.0
        res_list.append(item)
        
    return res_list

@router.get("/{id}", response_model=QuotationResponse)
async def get_quotation(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.line_items), selectinload(Quotation.vendor))
        .filter(Quotation.id == id)
    )
    q = result.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    if current_user.role == UserRole.vendor and q.vendor_id != current_user.vendor_id:
        raise HTTPException(status_code=403, detail="You do not have access to this quotation.")
        
    item = QuotationResponse.model_validate(q)
    item.vendor_name = q.vendor.name
    item.vendor_rating = float(q.vendor.rating) if q.vendor.rating else 0.0
    return item

@router.post("/", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
async def create_quotation(
    q_in: QuotationCreate,
    current_user: User = Depends(require_role("vendor")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    if not current_user.vendor_id:
        raise HTTPException(status_code=400, detail="Vendor user profile is not linked to any vendor organization.")
        
    # Check if a quotation already exists for this RFQ and vendor
    existing_res = await db.execute(
        select(Quotation).filter(Quotation.rfq_id == q_in.rfq_id, Quotation.vendor_id == current_user.vendor_id)
    )
    existing_q = existing_res.scalars().first()
    if existing_q:
        raise HTTPException(status_code=400, detail="A quotation has already been created for this RFQ by your organization.")
        
    # Verify RFQ is published
    rfq_res = await db.execute(select(Rfq).filter(Rfq.id == q_in.rfq_id))
    rfq = rfq_res.scalars().first()
    if not rfq or rfq.status == RfqStatus.draft:
        raise HTTPException(status_code=400, detail="RFQ is not active or published.")
        
    # Generate sequential Quotation Number
    q_num = await next_number(db, "QT", "quotation")
    
    # Calculate values
    subtotal = sum(item.quantity * item.unit_price for item in q_in.line_items)
    tax_amount = subtotal * (q_in.tax_percent / 100.0)
    grand_total = subtotal + tax_amount
    max_delivery_days = max((item.delivery_days for item in q_in.line_items if item.delivery_days is not None), default=None)
    
    q = Quotation(
        quotation_number=q_num,
        rfq_id=q_in.rfq_id,
        vendor_id=current_user.vendor_id,
        status=QuotationStatus.submitted if q_in.submit else QuotationStatus.draft,
        subtotal=subtotal,
        tax_percent=q_in.tax_percent,
        tax_amount=tax_amount,
        grand_total=grand_total,
        delivery_days=max_delivery_days,
        payment_terms=q_in.payment_terms,
        notes=q_in.notes,
        submitted_at=datetime.utcnow() if q_in.submit else None
    )
    db.add(q)
    await db.flush() # get q.id
    
    # Add line items
    for item in q_in.line_items:
        line = QuotationLineItem(
            quotation_id=q.id,
            item_name=item.item_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=item.quantity * item.unit_price,
            delivery_days=item.delivery_days
        )
        db.add(line)
        
    # If submitted, update related models
    if q_in.submit:
        # Update rfq_vendor status
        rv_res = await db.execute(
            select(RfqVendor).filter(RfqVendor.rfq_id == q_in.rfq_id, RfqVendor.vendor_id == current_user.vendor_id)
        )
        rfq_vendor = rv_res.scalars().first()
        if rfq_vendor:
            rfq_vendor.status = RfqVendorStatus.quoted
            db.add(rfq_vendor)
            
        # Update RFQ status to quotations_received if it was published
        if rfq.status == RfqStatus.published:
            rfq.status = RfqStatus.quotations_received
            db.add(rfq)
            
        # Audit log
        await write_activity(
            db,
            actor_id=current_user.id,
            actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
            entity_type="quotation",
            entity_id=q.id,
            action="submitted",
            description=f"Submitted quotation {q.quotation_number} (Total: ₹{grand_total:.2f}) for RFQ {rfq.rfq_number}"
        )
    else:
        # Audit log for draft
        await write_activity(
            db,
            actor_id=current_user.id,
            actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
            entity_type="quotation",
            entity_id=q.id,
            action="created",
            description=f"Created draft quotation {q.quotation_number} for RFQ {rfq.rfq_number}"
        )
        
    await db.commit()
    
    # Reload q
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.line_items), selectinload(Quotation.vendor))
        .filter(Quotation.id == q.id)
    )
    db_q = result.scalars().first()
    item = QuotationResponse.model_validate(db_q)
    item.vendor_name = db_q.vendor.name
    item.vendor_rating = float(db_q.vendor.rating) if db_q.vendor.rating else 0.0
    return item

@router.post("/{id}/submit", response_model=QuotationResponse)
async def submit_quotation(
    id: UUID,
    current_user: User = Depends(require_role("vendor")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.line_items), selectinload(Quotation.vendor))
        .filter(Quotation.id == id)
    )
    q = result.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    if q.vendor_id != current_user.vendor_id:
        raise HTTPException(status_code=403, detail="You do not have access to submit this quotation.")
        
    if q.status != QuotationStatus.draft:
        raise HTTPException(status_code=400, detail="Quotation is already submitted or closed.")
        
    q.status = QuotationStatus.submitted
    q.submitted_at = datetime.utcnow()
    db.add(q)
    
    # Update RFQ and RfqVendor
    rfq_res = await db.execute(select(Rfq).filter(Rfq.id == q.rfq_id))
    rfq = rfq_res.scalars().first()
    if rfq:
        # Update rfq_vendor status
        rv_res = await db.execute(
            select(RfqVendor).filter(RfqVendor.rfq_id == q.rfq_id, RfqVendor.vendor_id == current_user.vendor_id)
        )
        rfq_vendor = rv_res.scalars().first()
        if rfq_vendor:
            rfq_vendor.status = RfqVendorStatus.quoted
            db.add(rfq_vendor)
            
        # Update RFQ status to quotations_received
        if rfq.status == RfqStatus.published:
            rfq.status = RfqStatus.quotations_received
            db.add(rfq)
            
    # Audit log
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="quotation",
        entity_id=q.id,
        action="submitted",
        description=f"Submitted quotation {q.quotation_number} (Total: ₹{q.grand_total:.2f}) for RFQ {rfq.rfq_number if rfq else ''}"
    )
    
    await db.commit()
    
    item = QuotationResponse.model_validate(q)
    item.vendor_name = q.vendor.name
    item.vendor_rating = float(q.vendor.rating) if q.vendor.rating else 0.0
    return item

@router.post("/{id}/select", response_model=QuotationResponse)
async def select_quotation(
    id: UUID,
    approval_in: Optional[ApprovalCreate] = None,
    current_user: User = Depends(require_role("admin", "procurement_officer")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # 1. Load quotation
    q_res = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.vendor))
        .filter(Quotation.id == id)
    )
    q = q_res.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    if q.status != QuotationStatus.submitted:
        raise HTTPException(status_code=400, detail="Only submitted quotations can be selected.")
        
    # Load RFQ
    rfq_res = await db.execute(select(Rfq).filter(Rfq.id == q.rfq_id))
    rfq = rfq_res.scalars().first()
    if not rfq:
        raise HTTPException(status_code=404, detail="Related RFQ not found")
        
    # 2. Set selected quotation to 'selected', others for the RFQ to 'rejected'
    q.status = QuotationStatus.selected
    db.add(q)
    
    await db.execute(
        Quotation.__table__.update()
        .where(Quotation.rfq_id == q.rfq_id)
        .where(Quotation.id != q.id)
        .where(Quotation.status == QuotationStatus.submitted)
        .values(status=QuotationStatus.rejected)
    )
    
    # Set RFQ status to 'under_review'
    rfq.status = RfqStatus.under_review
    db.add(rfq)
    
    # 3. Create the approval chain
    # Find approver_ids. If not provided, fetch the first 2 managers
    approver_ids = approval_in.approver_ids if approval_in else None
    if not approver_ids or len(approver_ids) < 2:
        mgr_res = await db.execute(
            select(User)
            .filter(User.role == UserRole.manager, User.is_active == True)
            .order_by(User.created_at.asc())
            .limit(2)
        )
        managers = mgr_res.scalars().all()
        if len(managers) < 2:
            # Fallback: find any manager or admin if managers are fewer than 2
            fallback_res = await db.execute(
                select(User)
                .filter(User.role.in_([UserRole.manager, UserRole.admin]), User.is_active == True)
                .order_by(User.created_at.asc())
                .limit(2)
            )
            managers = fallback_res.scalars().all()
            if len(managers) < 2:
                # If we still can't find 2 users, use current user as L1 and L2
                managers = [current_user, current_user]
        
        # If we have 1 manager, duplicate it to fill L2
        if len(managers) == 1:
            managers = [managers[0], managers[0]]
            
        approver_ids = [m.id for m in managers[:2]]
        
    # Level 1 Approval
    l1_user_res = await db.execute(select(User).filter(User.id == approver_ids[0]))
    l1_user = l1_user_res.scalars().first()
    l1_name = f"{l1_user.first_name} {l1_user.last_name or ''}".strip() if l1_user else "L1 Manager"
    
    # Level 2 Approval
    l2_user_res = await db.execute(select(User).filter(User.id == approver_ids[1]))
    l2_user = l2_user_res.scalars().first()
    l2_name = f"{l2_user.first_name} {l2_user.last_name or ''}".strip() if l2_user else "L2 Manager"
    
    l1_approval = Approval(
        rfq_id=q.rfq_id,
        quotation_id=q.id,
        level=1,
        approver_id=approver_ids[0],
        approver_name=l1_name,
        status=ApprovalStatus.pending
    )
    l2_approval = Approval(
        rfq_id=q.rfq_id,
        quotation_id=q.id,
        level=2,
        approver_id=approver_ids[1],
        approver_name=l2_name,
        status=ApprovalStatus.pending
    )
    db.add(l1_approval)
    db.add(l2_approval)
    
    # Notify L1 Approver
    notif = Notification(
        user_id=approver_ids[0],
        type="approval_required",
        message=f"Approval required: RFQ '{rfq.title}' ({rfq.rfq_number}) - L1 Review",
        link=f"/approvals/rfq/{rfq.id}",
        is_read=False
    )
    db.add(notif)
    
    # Audit log
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="rfq",
        entity_id=q.rfq_id,
        action="selected",
        description=f"Selected quotation {q.quotation_number} (₹{q.grand_total:.2f}) from vendor {q.vendor.name}. Initiated approval workflow."
    )
    
    await db.commit()
    
    # Reload quotation
    result = await db.execute(
        select(Quotation)
        .options(selectinload(Quotation.line_items), selectinload(Quotation.vendor))
        .filter(Quotation.id == id)
    )
    db_q = result.scalars().first()
    item = QuotationResponse.model_validate(db_q)
    item.vendor_name = db_q.vendor.name
    item.vendor_rating = float(db_q.vendor.rating) if db_q.vendor.rating else 0.0
    return item
