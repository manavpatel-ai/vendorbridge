from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, func
from typing import Any, List, Optional
from uuid import UUID

from app.core.deps import get_db, require_role
from app.models.all_models import Vendor, VendorStatus, User
from app.schemas.all_schemas import VendorCreate, VendorUpdate, VendorResponse, VendorListResponse
from app.services.logging_service import write_activity

router = APIRouter(dependencies=[Depends(require_role("admin", "procurement_officer"))])

@router.get("/", response_model=VendorListResponse)
async def list_vendors(
    q: Optional[str] = Query(None, description="Search term for name, category, or gst"),
    status_filter: Optional[VendorStatus] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Build query for vendors
    query = select(Vendor)
    
    # We will build sub-queries or filters for calculating counts
    # To make counts reactive to filters (q and category), we apply those filters
    # when calculating counts.
    count_filters = []
    
    if q:
        search_filter = or_(
            Vendor.name.ilike(f"%{q}%"),
            Vendor.category.ilike(f"%{q}%"),
            Vendor.gst_number.ilike(f"%{q}%"),
            Vendor.contact_name.ilike(f"%{q}%")
        )
        query = query.filter(search_filter)
        count_filters.append(search_filter)
        
    if category:
        cat_filter = Vendor.category == category
        query = query.filter(cat_filter)
        count_filters.append(cat_filter)
        
    # Apply status filter only to the rows query, not the counts queries
    rows_query = query
    if status_filter:
        rows_query = rows_query.filter(Vendor.status == status_filter)
        
    # Execute rows query
    result = await db.execute(rows_query.order_by(Vendor.name))
    vendors = result.scalars().all()
    
    # Calculate counts for each status — single grouped query instead of 3 separate ones
    count_base = select(Vendor.status, func.count(Vendor.id)).group_by(Vendor.status)
    for f in count_filters:
        count_base = count_base.filter(f)
    cnt_res = await db.execute(count_base)
    
    counts = {"all": 0, "active": 0, "pending": 0, "blocked": 0}
    for s_val, cnt in cnt_res.all():
        key = s_val.value if hasattr(s_val, 'value') else str(s_val)
        counts[key] = cnt
        counts["all"] += cnt
        
    return {
        "vendors": vendors,
        "counts": counts
    }

@router.post("/", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    vendor_in: VendorCreate,
    current_user: User = Depends(require_role("admin", "procurement_officer")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    db_obj = Vendor(
        name=vendor_in.name,
        category=vendor_in.category,
        gst_number=vendor_in.gst_number,
        contact_name=vendor_in.contact_name,
        contact_phone=vendor_in.contact_phone,
        contact_email=vendor_in.contact_email,
        address=vendor_in.address,
        status=VendorStatus.pending,
        rating=0.0,
        created_by=current_user.id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    
    # Audit log
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="vendor",
        entity_id=db_obj.id,
        action="created",
        description=f"Created vendor profile for '{db_obj.name}'"
    )
    await db.commit()
    
    return db_obj

@router.get("/{id}", response_model=VendorResponse)
async def get_vendor(
    id: UUID,
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(Vendor).filter(Vendor.id == id))
    vendor = result.scalars().first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

@router.patch("/{id}", response_model=VendorResponse)
async def update_vendor(
    id: UUID,
    vendor_in: VendorUpdate,
    current_user: User = Depends(require_role("admin", "procurement_officer")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(Vendor).filter(Vendor.id == id))
    vendor = result.scalars().first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    update_data = vendor_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vendor, field, value)
        
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    
    # Audit log
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="vendor",
        entity_id=vendor.id,
        action="updated",
        description=f"Updated details for vendor '{vendor.name}'"
    )
    await db.commit()
    
    return vendor

@router.patch("/{id}/status", response_model=VendorResponse)
async def update_vendor_status(
    id: UUID,
    status: VendorStatus = Query(..., description="New status for the vendor"),
    current_user: User = Depends(require_role("admin", "procurement_officer")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(Vendor).filter(Vendor.id == id))
    vendor = result.scalars().first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    old_status = vendor.status.value
    vendor.status = status
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    
    # Audit log
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="vendor",
        entity_id=vendor.id,
        action="status_changed",
        description=f"Changed vendor '{vendor.name}' status from '{old_status}' to '{status.value}'"
    )
    await db.commit()
    
    return vendor
