from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Any, List, Optional

from app.core.deps import get_db, require_role
from app.models.all_models import ActivityLog
from app.schemas.all_schemas import ActivityLogResponse

router = APIRouter(dependencies=[Depends(require_role("admin", "procurement_officer", "manager"))])

@router.get("/", response_model=List[ActivityLogResponse])
async def list_activity_logs(
    entity_type: Optional[str] = Query(None, description="Filter logs by entity type (rfq, quotation, vendor, etc.)"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Retrieves activity logs in reverse chronological order.
    No modifying endpoints are exposed here; logs are write-once only.
    """
    query = select(ActivityLog)
    
    if entity_type and entity_type != "all":
        query = query.filter(ActivityLog.entity_type == entity_type)
        
    query = query.order_by(ActivityLog.created_at.desc()).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return logs
