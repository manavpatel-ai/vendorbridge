from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.vendors import router as vendors_router
from app.api.rfqs import router as rfqs_router
from app.api.quotations import router as quotations_router
from app.api.approvals import router as approvals_router
from app.api.purchase_orders import router as po_router
from app.api.invoices import router as invoices_router
from app.api.dashboard import router as dashboard_router
from app.api.reports import router as reports_router
from app.api.activity import router as activity_router
from app.api.notifications import router as notifications_router
from app.api.chat import router as chat_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(vendors_router, prefix="/vendors", tags=["Vendors"])
api_router.include_router(rfqs_router, prefix="/rfqs", tags=["RFQs"])
api_router.include_router(quotations_router, prefix="/quotations", tags=["Quotations"])
api_router.include_router(approvals_router, prefix="/approvals", tags=["Approvals"])
api_router.include_router(po_router, prefix="/purchase-orders", tags=["Purchase Orders"])
api_router.include_router(invoices_router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(reports_router, prefix="/reports", tags=["Reports & Analytics"])
api_router.include_router(activity_router, prefix="/activity", tags=["Activity Audit Log"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(chat_router, prefix="/chat", tags=["AI Chat"])
