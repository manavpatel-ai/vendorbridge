from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import selectinload
from typing import Any, List, Optional
from datetime import date, datetime, timedelta
import csv
import io

from app.core.deps import get_db, require_role
from app.models.all_models import (
    PurchaseOrder, Vendor, VendorStatus, Invoice, InvoiceStatus, Rfq, UserRole
)
from app.schemas.all_schemas import ReportsAnalytics

router = APIRouter(dependencies=[Depends(require_role("admin", "procurement_officer", "manager"))])

@router.get("/analytics", response_model=ReportsAnalytics)
async def get_analytics(
    month: str = Query(..., description="Format: YYYY-MM"),
    db: AsyncSession = Depends(get_db)
) -> Any:
    try:
        year_str, month_str = month.split("-")
        req_year = int(year_str)
        req_month = int(month_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Please use YYYY-MM.")
        
    start_date = date(req_year, req_month, 1)
    if req_month == 12:
        end_date = date(req_year + 1, 1, 1)
    else:
        end_date = date(req_year, req_month + 1, 1)
        
    # 1. Total Spend (POs grand_total in target month)
    po_query = select(func.sum(PurchaseOrder.grand_total)).filter(
        PurchaseOrder.po_date >= start_date,
        PurchaseOrder.po_date < end_date
    )
    po_res = await db.execute(po_query)
    total_spend = float(po_res.scalar() or 0)
    
    # 2. Active Vendors
    v_query = select(func.count(Vendor.id)).filter(Vendor.status == VendorStatus.active)
    v_res = await db.execute(v_query)
    active_vendors = v_res.scalar() or 0
    
    # 3. PO Fulfillment Percentage
    # POs in this month that have at least one paid invoice
    total_po_query = select(func.count(PurchaseOrder.id)).filter(
        PurchaseOrder.po_date >= start_date,
        PurchaseOrder.po_date < end_date
    )
    total_po_res = await db.execute(total_po_query)
    total_pos = total_po_res.scalar() or 0
    
    fulfilled_pos = 0
    if total_pos > 0:
        fulfilled_query = (
            select(func.count(func.distinct(PurchaseOrder.id)))
            .join(Invoice, Invoice.po_id == PurchaseOrder.id)
            .filter(
                PurchaseOrder.po_date >= start_date,
                PurchaseOrder.po_date < end_date,
                Invoice.status == InvoiceStatus.paid
            )
        )
        fulfilled_res = await db.execute(fulfilled_query)
        fulfilled_pos = fulfilled_res.scalar() or 0
        
    fulfillment_pct = (fulfilled_pos / total_pos * 100.0) if total_pos > 0 else 100.0
    
    # 4. Overdue Invoices
    overdue_query = select(func.count(Invoice.id)).filter(
        Invoice.status == InvoiceStatus.pending_payment,
        Invoice.due_date < date.today()
    )
    overdue_res = await db.execute(overdue_query)
    overdue_invoices = overdue_res.scalar() or 0
    
    # 5. Spend by Category
    # Join PurchaseOrder -> Rfq, sum po grand_total, group by rfq.category
    cat_query = (
        select(Rfq.category, func.sum(PurchaseOrder.grand_total))
        .join(PurchaseOrder, PurchaseOrder.rfq_id == Rfq.id)
        .filter(PurchaseOrder.po_date >= start_date, PurchaseOrder.po_date < end_date)
        .group_by(Rfq.category)
    )
    cat_res = await db.execute(cat_query)
    spend_by_category = []
    for cat_name, sum_spend in cat_res.all():
        spend_by_category.append({
            "name": cat_name or "Uncategorized",
            "value": float(sum_spend or 0)
        })
        
    # 6. Top Vendors by Spend
    # Group POs by Vendor
    top_vendors_query = (
        select(Vendor.name, func.sum(PurchaseOrder.grand_total), func.count(PurchaseOrder.id))
        .join(PurchaseOrder, PurchaseOrder.vendor_id == Vendor.id)
        .filter(PurchaseOrder.po_date >= start_date, PurchaseOrder.po_date < end_date)
        .group_by(Vendor.name)
        .order_by(func.sum(PurchaseOrder.grand_total).desc())
        .limit(5)
    )
    top_v_res = await db.execute(top_vendors_query)
    top_vendors = []
    for v_name, spend_sum, po_cnt in top_v_res.all():
        top_vendors.append({
            "name": v_name,
            "spend": float(spend_sum or 0),
            "count": po_cnt or 0
        })
        
    # 7. Monthly Trend (overall monthly spend for previous 6 months including this month)
    monthly_trend = []
    from calendar import month_name
    for i in range(5, -1, -1):
        # Subtract months
        # A simple estimation: subtracting i * 30 days
        target_date = start_date - timedelta(days=i * 30)
        t_month = target_date.month
        t_year = target_date.year
        
        t_start = date(t_year, t_month, 1)
        if t_month == 12:
            t_end = date(t_year + 1, 1, 1)
        else:
            t_end = date(t_year, t_month + 1, 1)
            
        trend_query = select(func.sum(PurchaseOrder.grand_total)).filter(
            PurchaseOrder.po_date >= t_start,
            PurchaseOrder.po_date < t_end
        )
        trend_res = await db.execute(trend_query)
        month_spend = float(trend_res.scalar() or 0)
        
        monthly_trend.append({
            "name": f"{month_name[t_month][:3]} {t_year}",
            "value": month_spend
        })
        
    return {
        "total_spend": total_spend,
        "active_vendors": active_vendors,
        "po_fulfillment_pct": fulfillment_pct,
        "overdue_invoices": overdue_invoices,
        "spend_by_category": spend_by_category,
        "top_vendors_by_spend": top_vendors,
        "monthly_trend": monthly_trend
    }

@router.get("/export")
async def export_monthly_report(
    month: str = Query(..., description="Format: YYYY-MM"),
    db: AsyncSession = Depends(get_db)
) -> Any:
    try:
        year_str, month_str = month.split("-")
        req_year = int(year_str)
        req_month = int(month_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Please use YYYY-MM.")
        
    start_date = date(req_year, req_month, 1)
    if req_month == 12:
        end_date = date(req_year + 1, 1, 1)
    else:
        end_date = date(req_year, req_month + 1, 1)
        
    # Query all POs for this month
    po_query = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.vendor))
        .filter(PurchaseOrder.po_date >= start_date, PurchaseOrder.po_date < end_date)
        .order_by(PurchaseOrder.po_date.asc())
    )
    result = await db.execute(po_query)
    pos = result.scalars().all()
    
    # Create CSV memory buffer
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write CSV Header
    writer.writerow([
        "PO Number", "PO Date", "Vendor", "Buyer Organization", 
        "Subtotal (INR)", "CGST (INR)", "SGST (INR)", "IGST (INR)", 
        "Grand Total (INR)", "Status"
    ])
    
    # Write CSV Rows
    for po in pos:
        writer.writerow([
            po.po_number,
            po.po_date.strftime("%Y-%m-%d"),
            po.vendor.name,
            po.buyer_org_name,
            f"{po.subtotal:.2f}",
            f"{po.cgst:.2f}",
            f"{po.sgst:.2f}",
            f"{po.igst:.2f}",
            f"{po.grand_total:.2f}",
            po.status
        ])
        
    # Return as StreamingResponse
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=Procurement_Report_{month}.csv"}
    )
