from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, extract
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
    # Active statuses: published, quotations_received, under_review, approved
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
    
    # 2. Pending Approvals Count
    pending_approvals_count = 0
    if current_user.role in [UserRole.manager, UserRole.admin]:
        # Count approvals assigned to this user that are pending and currently active (L1 pending, or L2 pending when L1 is approved)
        app_query = select(Approval).filter(
            Approval.approver_id == current_user.id,
            Approval.status == ApprovalStatus.pending
        )
        app_res = await db.execute(app_query)
        approvals = app_res.scalars().all()
        
        for appr in approvals:
            if appr.level == 1:
                pending_approvals_count += 1
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
                    pending_approvals_count += 1
                    
    # 3. PO Total This Month (Grand Total sum)
    po_query = select(func.sum(PurchaseOrder.grand_total))
    if current_user.role == UserRole.vendor:
        po_query = po_query.filter(PurchaseOrder.vendor_id == current_user.vendor_id)
    # Filter for current month
    po_query = po_query.filter(
        PurchaseOrder.po_date >= start_of_month,
        PurchaseOrder.po_date <= today
    )
    po_res = await db.execute(po_query)
    po_total = float(po_res.scalar() or 0)
    
    # 4. Overdue Invoices Count (pending_payment and due_date < today)
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
    recent_pos = recent_po_res.scalars().all()
    
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
        
    # 6. Spend Trend 6 Months (IT hardware, logistics, etc. or overall monthly spend)
    # Let's return overall monthly PO spend for the last 6 months
    spend_trend = []
    for i in range(5, -1, -1):
        target_date = today - timedelta(days=i * 30)
        t_month = target_date.month
        t_year = target_date.year
        t_start = date(t_year, t_month, 1)
        if t_month == 12:
            t_end = date(t_year + 1, 1, 1) - timedelta(days=1)
        else:
            t_end = date(t_year, t_month + 1, 1) - timedelta(days=1)
            
        trend_query = select(func.sum(PurchaseOrder.grand_total)).filter(
            PurchaseOrder.po_date >= t_start,
            PurchaseOrder.po_date <= t_end
        )
        if current_user.role == UserRole.vendor:
            trend_query = trend_query.filter(PurchaseOrder.vendor_id == current_user.vendor_id)
            
        trend_res = await db.execute(trend_query)
        month_spend = float(trend_res.scalar() or 0)
        
        spend_trend.append({
            "name": f"{month_name[t_month][:3]} {t_year}",
            "value": month_spend
        })
        
    return {
        "active_rfqs": active_rfqs_count,
        "pending_approvals": pending_approvals_count,
        "po_total_this_month": po_total,
        "overdue_invoices": overdue_count,
        "recent_purchase_orders": recent_po_list,
        "spend_trend_6m": spend_trend
    }
