from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime

from app.core.deps import get_db, get_current_user, require_role
from app.models.all_models import Approval, ApprovalStatus, Rfq, RfqStatus, User, UserRole, Notification
from app.schemas.all_schemas import ApprovalResponse, ApprovalAction
from app.services.logging_service import write_activity

router = APIRouter()

@router.get("/pending", response_model=List[ApprovalResponse])
async def list_pending_approvals(
    current_user: User = Depends(require_role("manager", "admin")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    # Get approvals assigned to current user that are pending
    query = select(Approval).filter(
        Approval.approver_id == current_user.id,
        Approval.status == ApprovalStatus.pending
    )
    
    # We must check level order: if it's level 2, it's only pending if level 1 is approved!
    # Let's write a filter to ensure we only get approvals that are CURRENTLY active.
    # Level 1 is always active if pending.
    # Level 2 is only active if the corresponding Level 1 approval is 'approved'.
    result = await db.execute(query.order_by(Approval.created_at.desc()))
    approvals = result.scalars().all()
    
    active_approvals = []
    for appr in approvals:
        if appr.level == 1:
            active_approvals.append(appr)
        elif appr.level == 2:
            # Check L1 approval status
            l1_res = await db.execute(
                select(Approval).filter(
                    Approval.rfq_id == appr.rfq_id,
                    Approval.quotation_id == appr.quotation_id,
                    Approval.level == 1
                )
            )
            l1 = l1_res.scalars().first()
            if l1 and l1.status == ApprovalStatus.approved:
                active_approvals.append(appr)
                
    return active_approvals

@router.get("/rfq/{rfq_id}", response_model=List[ApprovalResponse])
async def list_rfq_approvals(
    rfq_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    query = select(Approval).filter(Approval.rfq_id == rfq_id).order_by(Approval.level.asc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{id}/approve", response_model=ApprovalResponse)
async def approve_step(
    id: UUID,
    action_in: ApprovalAction,
    current_user: User = Depends(require_role("manager", "admin")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(Approval).filter(Approval.id == id))
    approval = result.scalars().first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval step not found")
        
    if approval.status != ApprovalStatus.pending:
        raise HTTPException(status_code=400, detail="This approval step has already been processed.")
        
    # Check if current user is the assigned approver (or admin)
    if approval.approver_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="You are not the designated approver for this step.")
        
    # Enforce level order: Level 2 cannot approve if Level 1 is not approved
    if approval.level == 2:
        l1_res = await db.execute(
            select(Approval).filter(
                Approval.rfq_id == approval.rfq_id,
                Approval.quotation_id == approval.quotation_id,
                Approval.level == 1
            )
        )
        l1 = l1_res.scalars().first()
        if not l1 or l1.status != ApprovalStatus.approved:
            raise HTTPException(
                status_code=400,
                detail="Cannot approve Level 2 step before Level 1 step is approved."
            )
            
    # Update status
    approval.status = ApprovalStatus.approved
    approval.remarks = action_in.remarks
    approval.acted_at = datetime.utcnow()
    db.add(approval)
    
    # Load RFQ
    rfq_res = await db.execute(select(Rfq).filter(Rfq.id == approval.rfq_id))
    rfq = rfq_res.scalars().first()
    
    # Check if this completes the chain
    if approval.level == 1:
        # Find Level 2 approval and notify L2 approver
        l2_res = await db.execute(
            select(Approval).filter(
                Approval.rfq_id == approval.rfq_id,
                Approval.quotation_id == approval.quotation_id,
                Approval.level == 2
            )
        )
        l2 = l2_res.scalars().first()
        if l2 and l2.approver_id:
            notif = Notification(
                user_id=l2.approver_id,
                type="approval_required",
                message=f"Approval required: RFQ '{rfq.title}' ({rfq.rfq_number}) - L2 Approval",
                link=f"/approvals/rfq/{rfq.id}",
                is_read=False
            )
            db.add(notif)
            
    elif approval.level == 2:
        # Final approval: update RFQ status to 'approved'
        if rfq:
            rfq.status = RfqStatus.approved
            db.add(rfq)
            
            # Notify the RFQ creator
            if rfq.created_by:
                notif = Notification(
                    user_id=rfq.created_by,
                    type="rfq_approved",
                    message=f"RFQ '{rfq.title}' ({rfq.rfq_number}) has been fully approved!",
                    link=f"/rfqs/{rfq.id}",
                    is_read=False
                )
                db.add(notif)
                
    # Audit log
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="approval",
        entity_id=approval.id,
        action="approved",
        description=f"Approved Level {approval.level} for RFQ '{rfq.rfq_number if rfq else ''}' (Remarks: {action_in.remarks or 'None'})"
    )
    
    await db.commit()
    
    # Reload
    result = await db.execute(select(Approval).filter(Approval.id == id))
    return result.scalars().first()

@router.post("/{id}/reject", response_model=ApprovalResponse)
async def reject_step(
    id: UUID,
    action_in: ApprovalAction,
    current_user: User = Depends(require_role("manager", "admin")),
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(select(Approval).filter(Approval.id == id))
    approval = result.scalars().first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval step not found")
        
    if approval.status != ApprovalStatus.pending:
        raise HTTPException(status_code=400, detail="This approval step has already been processed.")
        
    # Check if current user is the assigned approver (or admin)
    if approval.approver_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="You are not the designated approver for this step.")
        
    # Enforce level order: Level 2 cannot reject if Level 1 is not approved
    if approval.level == 2:
        l1_res = await db.execute(
            select(Approval).filter(
                Approval.rfq_id == approval.rfq_id,
                Approval.quotation_id == approval.quotation_id,
                Approval.level == 1
            )
        )
        l1 = l1_res.scalars().first()
        if not l1 or l1.status != ApprovalStatus.approved:
            raise HTTPException(
                status_code=400,
                detail="Cannot process Level 2 step before Level 1 step is approved."
            )
            
    # Update status
    approval.status = ApprovalStatus.rejected
    approval.remarks = action_in.remarks
    approval.acted_at = datetime.utcnow()
    db.add(approval)
    
    # Load RFQ and reset status to 'under_review' (so the officer can re-select another quotation)
    rfq_res = await db.execute(select(Rfq).filter(Rfq.id == approval.rfq_id))
    rfq = rfq_res.scalars().first()
    if rfq:
        rfq.status = RfqStatus.under_review
        db.add(rfq)
        
        # Notify the RFQ creator of rejection
        if rfq.created_by:
            notif = Notification(
                user_id=rfq.created_by,
                type="rfq_rejected",
                message=f"RFQ '{rfq.title}' ({rfq.rfq_number}) quotation was rejected by {current_user.first_name} (L{approval.level})",
                link=f"/rfqs/{rfq.id}",
                is_read=False
            )
            db.add(notif)
            
    # Audit log
    await write_activity(
        db,
        actor_id=current_user.id,
        actor_name=f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        entity_type="approval",
        entity_id=approval.id,
        action="rejected",
        description=f"Rejected Level {approval.level} for RFQ '{rfq.rfq_number if rfq else ''}' (Remarks: {action_in.remarks or 'None'})"
    )
    
    await db.commit()
    
    # Reload
    result = await db.execute(select(Approval).filter(Approval.id == id))
    return result.scalars().first()
