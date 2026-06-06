from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, extract, case
from sqlalchemy.orm import selectinload
from typing import Any, List
from datetime import date, datetime, timedelta
from uuid import UUID
from calendar import month_name

from app.core.deps import get_db, get_current_user
from app.models.all_models import (
    Rfq, RfqStatus, RfqVendor, Approval, ApprovalStatus, PurchaseOrder, Invoice, InvoiceStatus, User, UserRole
)
from app.schemas.all_schemas import DashboardSummary

router = APIRouter()

@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    today = date.today()
    start_of_month = date(today.year, today.month, 1)
    
    # 1. Active RFQs Count
    active_statuses = [RfqStatus.published, RfqStatus.quotations_received, RfqStatus.under_review, RfqStatus.approved]
    if current_user.role == UserRole.vendor:
        rfq_query = (
            select(func.count(Rfq.id))
            .join(RfqVendor)
            .filter(
                RfqVendor.vendor_id == current_user.vendor_id,
                Rfq.status.in_(active_statuses)
            )
        )
    else:
        rfq_query = select(func.count(Rfq.id)).filter(Rfq.status.in_(active_statuses))
        
    rfq_res = await db.execute(rfq_query)
    active_rfqs_count = rfq_res.scalar() or 0
    
    # 2. Pending Approvals Count — optimized: single query with join instead of N+1
    pending_approvals_count = 0
    if current_user.role in [UserRole.manager, UserRole.admin]:
        # Use a subquery to check L1 status for L2 approvals
        from sqlalchemy.orm import aliased
        L1 = aliased(Approval)
        
        # Count L1 pending approvals assigned to current user
        l1_count_query = select(func.count(Approval.id)).filter(
            Approval.approver_id == current_user.id,
            Approval.status == ApprovalStatus.pending,
            Approval.level == 1
        )
        l1_res = await db.execute(l1_count_query)
        l1_count = l1_res.scalar() or 0
        
        # Count L2 pending approvals where L1 is approved
        l2_count_query = (
            select(func.count(Approval.id))
            .join(L1, and_(
                L1.rfq_id == Approval.rfq_id,
                L1.quotation_id == Approval.quotation_id,
                L1.level == 1,
                L1.status == ApprovalStatus.approved
            ))
            .filter(
                Approval.approver_id == current_user.id,
                Approval.status == ApprovalStatus.pending,
                Approval.level == 2
            )
        )
        l2_res = await db.execute(l2_count_query)
        l2_count = l2_res.scalar() or 0
        
        pending_approvals_count = l1_count + l2_count
                    
    # 3. PO Total This Month
    po_query = select(func.sum(PurchaseOrder.grand_total))
    if current_user.role == UserRole.vendor:
        po_query = po_query.filter(PurchaseOrder.vendor_id == current_user.vendor_id)
    po_query = po_query.filter(
        PurchaseOrder.po_date >= start_of_month,
        PurchaseOrder.po_date <= today
    )
    po_res = await db.execute(po_query)
    po_total = float(po_res.scalar() or 0)
    
    # 4. Overdue Invoices Count
    inv_query = select(func.count(Invoice.id)).filter(
        Invoice.status == InvoiceStatus.pending_payment,
        Invoice.due_date < today
    )
    if current_user.role == UserRole.vendor:
        inv_query = inv_query.join(PurchaseOrder, Invoice.po_id == PurchaseOrder.id).filter(
            PurchaseOrder.vendor_id == current_user.vendor_id
        )
    inv_res = await db.execute(inv_query)
    overdue_count = inv_res.scalar() or 0
    
    # 5. Recent Purchase Orders (last 5)
    recent_po_query = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.vendor))
    )
    if current_user.role == UserRole.vendor:
        recent_po_query = recent_po_query.filter(PurchaseOrder.vendor_id == current_user.vendor_id)
        
    recent_po_query = recent_po_query.order_by(PurchaseOrder.created_at.desc()).limit(5)
    recent_po_res = await db.execute(recent_po_query)
    recent_pos = recent_po_res.unique().scalars().all()
    
    recent_po_list = []
    for po in recent_pos:
        recent_po_list.append({
            "id": str(po.id),
            "po_number": po.po_number,
            "vendor_name": po.vendor.name,
            "grand_total": float(po.grand_total),
            "status": po.status,
            "po_date": po.po_date.strftime("%d %b %Y")
        })
        
    # 6. Spend Trend 6 Months — optimized: single grouped query instead of 6 sequential queries
    # Calculate date range for last 6 months
    month_boundaries = []
    for i in range(5, -1, -1):
        target_date = today - timedelta(days=i * 30)
        t_month = target_date.month
        t_year = target_date.year
        t_start = date(t_year, t_month, 1)
        if t_month == 12:
            t_end = date(t_year + 1, 1, 1) - timedelta(days=1)
        else:
            t_end = date(t_year, t_month + 1, 1) - timedelta(days=1)
        month_boundaries.append((t_year, t_month, t_start, t_end))
    
    # Single query: group by year+month
    overall_start = month_boundaries[0][2]
    overall_end = month_boundaries[-1][3]
    
    trend_query = (
        select(
            extract('year', PurchaseOrder.po_date).label('yr'),
            extract('month', PurchaseOrder.po_date).label('mn'),
            func.sum(PurchaseOrder.grand_total)
        )
        .filter(
            PurchaseOrder.po_date >= overall_start,
            PurchaseOrder.po_date <= overall_end
        )
        .group_by('yr', 'mn')
    )
    if current_user.role == UserRole.vendor:
        trend_query = trend_query.filter(PurchaseOrder.vendor_id == current_user.vendor_id)
    
    trend_res = await db.execute(trend_query)
    trend_data = {(int(row[0]), int(row[1])): float(row[2] or 0) for row in trend_res.all()}
    
    spend_trend = []
    for t_year, t_month, _, _ in month_boundaries:
        spend_trend.append({
            "name": f"{month_name[t_month][:3]} {t_year}",
            "value": trend_data.get((t_year, t_month), 0)
        })
        
    return {
        "active_rfqs": active_rfqs_count,
        "pending_approvals": pending_approvals_count,
        "po_total_this_month": po_total,
        "overdue_invoices": overdue_count,
        "recent_purchase_orders": recent_po_list,
        "spend_trend_6m": spend_trend
    }
