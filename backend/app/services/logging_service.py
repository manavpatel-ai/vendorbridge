from sqlalchemy.ext.asyncio import AsyncSession
from app.models.all_models import ActivityLog
from typing import Optional, Any, Dict
from uuid import UUID

async def write_activity(
    db: AsyncSession,
    actor_id: Optional[UUID],
    actor_name: Optional[str],
    entity_type: str,
    entity_id: Optional[UUID],
    action: str,
    description: str,
    metadata: Optional[Dict[str, Any]] = None
) -> ActivityLog:
    """
    Inserts a record into the activity_logs table.
    Flushes changes to the database transaction context.
    """
    log = ActivityLog(
        actor_id=actor_id,
        actor_name=actor_name,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        description=description,
        metadata=metadata or {}
    )
    db.add(log)
    await db.flush()
    return log
