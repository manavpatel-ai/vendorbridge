from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Any, List, Optional
from uuid import UUID
import os

from app.core.deps import get_db, get_current_user, require_role
from app.models.all_models import Rfq, RfqLineItem, RfqVendor, Vendor, User, UserRole, RfqStatus, RfqVendorStatus, Quotation, QuotationStatus, Notification
from app.schemas.all_schemas import RfqCreate, RfqResponse, RfqUpdate, QuotationResponse
from app.services.numbering import next_number
from app.services.logging_service import write_activity

router = APIRouter()

@router.get("/", response_model=List[RfqResponse])
async def list_rfqs(
    status_filter: Optional[RfqStatus] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Build query depending on role
    if current_user.role == UserRole.vendor:
        if not current_user.vendor_id:
            raise HTTPException(status_code=400, detail="Vendor user profile is not linked to any vendor organization.")
        # Only show published RFQs that they are invited to
        query = (
            select(Rfq)
            .join(RfqVendor)
            .filter(RfqVendor.vendor_id == current_user.vendor_id)
            .filter(Rfq.status != RfqStatus.draft)
        )
    else:
        # Officer or Admin sees all
        query = select(Rfq)
        
    if status_filter:
        query = query.filter(Rfq.status == status_filter)
        
    # Order by creation date descending and eager load line items, vendors, and attachments
    query = query.options(
        selectinload(Rfq.line_items),
        selectinload(Rfq.vendors).selectinload(RfqVendor.vendor),
        selectinload(Rfq.attachments)
    ).order_by(Rfq.created_at.desc())
    
    result = await db.execute(query)
    rfqs = result.unique().scalars().all()
    
    return rfqs

@router.post("/", response_model=RfqResponse, status_code=status.HTTP_201_CREATED)
async def create_rfq(
    rfq_in: RfqCreate,
    current_user: User = Depends(require_role("admin", "procurement_officer")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Generate sequential RFQ Number
    rfq_num = await next_number(db, "RFQ", "rfq")
    
    # Initialize Rfq object
    rfq = Rfq(
        rfq_number=rfq_num,
        title=rfq_in.title,
        category=rfq_in.category,
        description=rfq_in.description,
        deadline=rfq_in.deadline,
        status=RfqStatus.published if rfq_in.publish else RfqStatus.draft,
        created_by=current_user.id
    )
    db.add(rfq)
    await db.flush() # get rfq.id
    
    # Create line items
    for item in rfq_in.line_items:
        line = RfqLineItem(
            rfq_id=rfq.id,
            item_name=item.item_name,
            quantity=item.quantity,
            unit=item.unit
        )
        db.add(line)
        
    # Assign vendors
    for v_id in rfq_in.vendor_ids:
        # Verify vendor exists
        v_res = await db.execute(select(Vendor).filter(Vendor.id == v_id))
        vendor = v_res.scalars().first()
        if not vendor:
            raise HTTPException(status_code=400, detail=f"Vendor with ID {v_id} does not exist.")
            
        rfq_vendor = RfqVendor(
            rfq_id=rfq.id,
            vendor_id=v_id,
            status=RfqVendorStatus.invited
        )
        db.add(rfq_vendor)
        
        # If published, create notifications for vendor users
        if rfq_in.publish:
            vu_res = await db.execute(select(User).filter(User.vendor_id == v_id))
            vendor_users = vu_res.scalars().all()
            for vu in vendor_users:
                notif = Notification(
                    user_id=vu.id,
                    type="rfq_invited",
                    message=f"You have been invited to quote for RFQ '{rfq.title}' ({rfq.rfq_number})",
                    link=f"/rfqs/{rfq.id}",
                    is_read=False
                )
                db.add(notif)
                
    # Audit log
    action = "published" if rfq_in.publish else "created"
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="rfq",
        entity_id=rfq.id,
        action=action,
        description=f"Created RFQ {rfq.rfq_number} ({rfq.title}) in {action} state."
    )
    
    await db.commit()
    
    # Reload rfq with relationships
    result = await db.execute(
        select(Rfq)
        .options(
            selectinload(Rfq.line_items),
            selectinload(Rfq.vendors).selectinload(RfqVendor.vendor),
            selectinload(Rfq.attachments)
        )
        .filter(Rfq.id == rfq.id)
    )
    return result.unique().scalars().first()

@router.get("/{id}", response_model=RfqResponse)
async def get_rfq(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Get RFQ
    result = await db.execute(
        select(Rfq)
        .options(
            selectinload(Rfq.line_items),
            selectinload(Rfq.vendors).selectinload(RfqVendor.vendor),
            selectinload(Rfq.attachments)
        )
        .filter(Rfq.id == id)
    )
    rfq = result.unique().scalars().first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    # Vendor permission check
    if current_user.role == UserRole.vendor:
        # Check if they are invited
        invited = any(v.vendor_id == current_user.vendor_id for v in rfq.vendors)
        if not invited:
            raise HTTPException(status_code=403, detail="You do not have permission to view this RFQ")
            
    return rfq

@router.patch("/{id}", response_model=RfqResponse)
async def update_rfq(
    id: UUID,
    rfq_in: RfqUpdate,
    current_user: User = Depends(require_role("admin", "procurement_officer")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(Rfq).filter(Rfq.id == id))
    rfq = result.scalars().first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    if rfq.status != RfqStatus.draft:
        raise HTTPException(status_code=400, detail="Cannot edit RFQ details unless it is in draft status.")
        
    # Update fields
    # (Simple field updates, for complex additions of items or vendors, we would clear and rebuild)
    update_data = rfq_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field not in ["line_items", "vendor_ids"]:
            setattr(rfq, field, value)
            
    # Commit changes
    db.add(rfq)
    
    # Audit log
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="rfq",
        entity_id=rfq.id,
        action="updated",
        description=f"Updated draft RFQ '{rfq.rfq_number}'."
    )
    await db.commit()
    
    # Reload
    result = await db.execute(
        select(Rfq)
        .options(
            selectinload(Rfq.line_items),
            selectinload(Rfq.vendors).selectinload(RfqVendor.vendor),
            selectinload(Rfq.attachments)
        )
        .filter(Rfq.id == id)
    )
    return result.unique().scalars().first()

@router.post("/{id}/publish", response_model=RfqResponse)
async def publish_rfq(
    id: UUID,
    current_user: User = Depends(require_role("admin", "procurement_officer")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(Rfq)
        .options(
            selectinload(Rfq.line_items),
            selectinload(Rfq.vendors)
        )
        .filter(Rfq.id == id)
    )
    rfq = result.scalars().first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    if rfq.status != RfqStatus.draft:
        raise HTTPException(status_code=400, detail="RFQ is already published or closed.")
        
    if not rfq.line_items:
        raise HTTPException(status_code=400, detail="Cannot publish RFQ without line items.")
        
    if not rfq.vendors:
        raise HTTPException(status_code=400, detail="Cannot publish RFQ without assigned vendors.")
        
    rfq.status = RfqStatus.published
    db.add(rfq)
    
    # Notify vendors
    for rv in rfq.vendors:
        vu_res = await db.execute(select(User).filter(User.vendor_id == rv.vendor_id))
        vendor_users = vu_res.scalars().all()
        for vu in vendor_users:
            notif = Notification(
                user_id=vu.id,
                type="rfq_invited",
                message=f"You have been invited to quote for RFQ '{rfq.title}' ({rfq.rfq_number})",
                link=f"/rfqs/{rfq.id}",
                is_read=False
            )
            db.add(notif)
            
    # Audit log
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="rfq",
        entity_id=rfq.id,
        action="published",
        description=f"Published RFQ {rfq.rfq_number} ({rfq.title})"
    )
    
    await db.commit()
    
    # Reload
    result = await db.execute(
        select(Rfq)
        .options(
            selectinload(Rfq.line_items),
            selectinload(Rfq.vendors).selectinload(RfqVendor.vendor),
            selectinload(Rfq.attachments)
        )
        .filter(Rfq.id == id)
    )
    return result.unique().scalars().first()

@router.get("/{id}/quotations", response_model=List[QuotationResponse])
async def list_rfq_quotations(
    id: UUID,
    current_user: User = Depends(require_role("admin", "procurement_officer", "manager")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Verify RFQ exists
    rfq_res = await db.execute(select(Rfq).filter(Rfq.id == id))
    rfq = rfq_res.scalars().first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    # Get all submitted quotations for this RFQ
    q_query = (
        select(Quotation)
        .options(
            selectinload(Quotation.line_items),
            selectinload(Quotation.vendor)
        )
        .filter(Quotation.rfq_id == id)
        .filter(Quotation.status != QuotationStatus.draft)
        .order_by(Quotation.grand_total.asc())
    )
    result = await db.execute(q_query)
    quotations = result.unique().scalars().all()
    
    # Map vendor names and ratings onto response objects
    res_list = []
    for q in quotations:
        item = QuotationResponse.model_validate(q)
        item.vendor_name = q.vendor.name
        item.vendor_rating = float(q.vendor.rating) if q.vendor.rating else 0.0
        res_list.append(item)
        
    return res_list

@router.post("/{id}/attachments")
async def upload_rfq_attachment(
    id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("admin", "procurement_officer")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Verify RFQ exists
    rfq_res = await db.execute(select(Rfq).filter(Rfq.id == id))
    rfq = rfq_res.scalars().first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    # Save file locally
    upload_dir = "backend/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, f"{id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    # Normally we save standard file URL, let's use a relative path
    file_url = f"/uploads/{id}_{file.filename}"
    
    # Save attachment log in db (wait, we can create a record but we don't need a model mapping if we just insert it)
    # Actually we do have an rfq_attachments table!
    from app.models.all_models import RfqAttachment
    attach = RfqAttachment(
        rfq_id=id,
        file_name=file.filename,
        file_url=file_url
    )
    db.add(attach)
    
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="rfq",
        entity_id=id,
        action="attachment_added",
        description=f"Uploaded attachment '{file.filename}' to RFQ '{rfq.rfq_number}'"
    )
    await db.commit()
    
    return {"file_name": file.filename, "file_url": file_url}
