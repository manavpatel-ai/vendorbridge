"""
AI Chat endpoint using Groq API.
Provides a context-aware assistant that knows the user's procurement data.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

from app.core.deps import get_db, get_current_user
from app.core.config import settings
from app.models.all_models import (
    User, UserRole, Vendor, Rfq, RfqStatus, RfqVendor,
    Quotation, QuotationStatus, Approval, ApprovalStatus,
    PurchaseOrder, Invoice, InvoiceStatus, Notification
)

router = APIRouter()

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"


# --- Schemas ---

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str


# --- Context builder ---

async def build_user_context(user: User, db: AsyncSession) -> str:
    """
    Builds a text summary of the user's data to inject into the system prompt.
    """
    today = date.today()
    ctx_parts = []

    ctx_parts.append(f"## Current User")
    ctx_parts.append(f"- Name: {user.first_name} {user.last_name or ''}")
    ctx_parts.append(f"- Email: {user.email}")
    ctx_parts.append(f"- Role: {user.role.value}")
    ctx_parts.append(f"- Today's date: {today.strftime('%d %B %Y')}")

    if user.role == UserRole.vendor:
        # Vendor-specific context
        if user.vendor_id:
            v_res = await db.execute(select(Vendor).filter(Vendor.id == user.vendor_id))
            vendor = v_res.scalars().first()
            if vendor:
                ctx_parts.append(f"\n## My Vendor Profile")
                ctx_parts.append(f"- Company: {vendor.name}")
                ctx_parts.append(f"- Category: {vendor.category}")
                ctx_parts.append(f"- Status: {vendor.status.value}")
                ctx_parts.append(f"- Rating: {vendor.rating}/5.0")

            # Vendor's quotations
            qt_res = await db.execute(
                select(Quotation).filter(Quotation.vendor_id == user.vendor_id)
                .order_by(Quotation.created_at.desc()).limit(10)
            )
            quotations = qt_res.scalars().all()
            if quotations:
                ctx_parts.append(f"\n## My Recent Quotations ({len(quotations)})")
                for q in quotations:
                    ctx_parts.append(f"- {q.quotation_number}: Status={q.status.value}, Grand Total=₹{q.grand_total:,.2f}")

            # Vendor's POs
            po_res = await db.execute(
                select(PurchaseOrder).filter(PurchaseOrder.vendor_id == user.vendor_id)
                .order_by(PurchaseOrder.created_at.desc()).limit(10)
            )
            pos = po_res.scalars().all()
            if pos:
                ctx_parts.append(f"\n## My Purchase Orders ({len(pos)})")
                for po in pos:
                    ctx_parts.append(f"- {po.po_number}: ₹{po.grand_total:,.2f}, Date={po.po_date}, Status={po.status}")

            # Vendor's RFQ invitations
            rfqv_res = await db.execute(
                select(RfqVendor).filter(RfqVendor.vendor_id == user.vendor_id)
            )
            rfq_vendors = rfqv_res.scalars().all()
            if rfq_vendors:
                rfq_ids = [rv.rfq_id for rv in rfq_vendors]
                rfq_res = await db.execute(
                    select(Rfq).filter(Rfq.id.in_(rfq_ids)).order_by(Rfq.created_at.desc())
                )
                rfqs = rfq_res.scalars().all()
                ctx_parts.append(f"\n## RFQs I'm Invited To ({len(rfqs)})")
                for r in rfqs:
                    ctx_parts.append(f"- {r.rfq_number}: {r.title}, Status={r.status.value}, Deadline={r.deadline}")

    else:
        # Admin / Procurement Officer / Manager context
        # RFQ summary
        rfq_counts = {}
        for st in RfqStatus:
            cnt_res = await db.execute(select(func.count(Rfq.id)).filter(Rfq.status == st))
            cnt = cnt_res.scalar() or 0
            if cnt > 0:
                rfq_counts[st.value] = cnt

        ctx_parts.append(f"\n## RFQ Summary")
        for st, cnt in rfq_counts.items():
            ctx_parts.append(f"- {st}: {cnt}")

        # Recent RFQs
        rfq_res = await db.execute(
            select(Rfq).order_by(Rfq.created_at.desc()).limit(8)
        )
        rfqs = rfq_res.scalars().all()
        if rfqs:
            ctx_parts.append(f"\n## Recent RFQs")
            for r in rfqs:
                ctx_parts.append(f"- {r.rfq_number}: {r.title} | Category={r.category} | Status={r.status.value} | Deadline={r.deadline}")

        # Pending approvals
        if user.role in [UserRole.manager, UserRole.admin]:
            app_res = await db.execute(
                select(Approval).filter(
                    Approval.approver_id == user.id,
                    Approval.status == ApprovalStatus.pending
                )
            )
            pending = app_res.scalars().all()
            ctx_parts.append(f"\n## My Pending Approvals: {len(pending)}")
            for a in pending:
                ctx_parts.append(f"- Approval Level {a.level} for Quotation ID {a.quotation_id}")

        # Vendor summary
        vendor_res = await db.execute(select(func.count(Vendor.id)))
        active_res = await db.execute(select(func.count(Vendor.id)).filter(Vendor.status == "active"))
        total_vendors = vendor_res.scalar() or 0
        active_vendors = active_res.scalar() or 0
        ctx_parts.append(f"\n## Vendors: {total_vendors} total, {active_vendors} active")

        # PO summary this month
        start_of_month = date(today.year, today.month, 1)
        po_sum_res = await db.execute(
            select(func.sum(PurchaseOrder.grand_total)).filter(
                PurchaseOrder.po_date >= start_of_month, PurchaseOrder.po_date <= today
            )
        )
        po_total = float(po_sum_res.scalar() or 0)
        po_count_res = await db.execute(
            select(func.count(PurchaseOrder.id)).filter(
                PurchaseOrder.po_date >= start_of_month, PurchaseOrder.po_date <= today
            )
        )
        po_count = po_count_res.scalar() or 0
        ctx_parts.append(f"\n## Purchase Orders This Month: {po_count} orders, ₹{po_total:,.2f} total")

        # All-time PO total
        all_po_res = await db.execute(select(func.sum(PurchaseOrder.grand_total)))
        all_po_total = float(all_po_res.scalar() or 0)
        all_po_count_res = await db.execute(select(func.count(PurchaseOrder.id)))
        all_po_count = all_po_count_res.scalar() or 0
        ctx_parts.append(f"## All-Time PO: {all_po_count} orders, ₹{all_po_total:,.2f}")

        # Invoice summary
        overdue_res = await db.execute(
            select(func.count(Invoice.id)).filter(
                Invoice.status == InvoiceStatus.pending_payment,
                Invoice.due_date < today
            )
        )
        overdue = overdue_res.scalar() or 0
        pending_res = await db.execute(
            select(func.count(Invoice.id)).filter(Invoice.status == InvoiceStatus.pending_payment)
        )
        pending_inv = pending_res.scalar() or 0
        paid_res = await db.execute(
            select(func.count(Invoice.id)).filter(Invoice.status == InvoiceStatus.paid)
        )
        paid_inv = paid_res.scalar() or 0
        ctx_parts.append(f"\n## Invoices: {pending_inv} pending, {overdue} overdue, {paid_inv} paid")

    # Notifications (for all roles)
    notif_res = await db.execute(
        select(Notification).filter(
            Notification.user_id == user.id,
            Notification.is_read == False
        ).order_by(Notification.created_at.desc()).limit(5)
    )
    notifs = notif_res.scalars().all()
    if notifs:
        ctx_parts.append(f"\n## Unread Notifications ({len(notifs)})")
        for n in notifs:
            ctx_parts.append(f"- [{n.type}] {n.message}")

    return "\n".join(ctx_parts)


SYSTEM_PROMPT = """You are **VendorBridge AI**, an intelligent procurement assistant embedded in the VendorBridge procurement management platform.

Your role is to help users with:
- Understanding their procurement data (RFQs, quotations, purchase orders, invoices)
- Answering questions about their pending tasks and approvals
- Providing insights on spending patterns and vendor performance
- Guiding users through procurement workflows
- Suggesting best practices for procurement operations

**Response Guidelines:**
- Always respond in **rich Markdown** format.
- Use **bold**, *italic*, `code`, tables, lists, and headings when appropriate to make responses scannable and professional.
- Use ₹ for Indian currency formatting.
- Be concise but thorough. Use bullet points and tables for data.
- When referencing specific RFQs, POs, or invoices, mention their numbers (e.g., RFQ-2026-0001, PO-2026-0001).
- If you don't have enough data to answer, say so clearly and suggest what the user can do.
- Be friendly and professional. You're a procurement expert.
- Never fabricate data. Only use information provided in the user context below.

---

## User's Current Data Context:

{user_context}
"""


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """AI-powered chat endpoint using Groq API with user-specific procurement context."""

    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Chat is not configured. Please set GROQ_API_KEY in environment."
        )

    # Build user-specific context
    user_context = await build_user_context(current_user, db)
    system_message = SYSTEM_PROMPT.format(user_context=user_context)

    # Build messages array
    messages = [{"role": "system", "content": system_message}]

    # Add conversation history (last 10 messages to stay within context)
    for msg in request.history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    # Add the new user message
    messages.append({"role": "user", "content": request.message})

    # Call Groq API
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2048,
                    "top_p": 0.9,
                }
            )

            if response.status_code != 200:
                error_detail = response.text
                print(f"[GROQ ERROR] Status {response.status_code}: {error_detail}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"AI service error: {response.status_code}"
                )

            data = response.json()
            reply = data["choices"][0]["message"]["content"]
            return ChatResponse(reply=reply)

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI service timed out. Please try again."
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[CHAT ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request."
        )
