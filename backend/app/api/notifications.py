from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Any, List
from uuid import UUID

from app.core.deps import get_db, get_current_user
from app.models.all_models import Notification, User
from app.schemas.all_schemas import NotificationResponse

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Lists all notifications for the logged-in user, sorted by newest first.
    """
    query = (
        select(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/{id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Marks the specified notification as read.
    """
    result = await db.execute(
        select(Notification)
        .filter(Notification.id == id, Notification.user_id == current_user.id)
    )
    notification = result.scalars().first()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
        
    notification.is_read = True
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    
    return notification
