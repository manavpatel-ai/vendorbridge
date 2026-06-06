from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any
from datetime import datetime, date
from uuid import UUID
from app.models.all_models import UserRole, VendorStatus, RfqStatus, RfqVendorStatus, QuotationStatus, ApprovalStatus, InvoiceStatus

# ===== AUTH SCHEMAS =====
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    role: UserRole = UserRole.procurement_officer
    vendor_id: Optional[UUID] = None
    additional_info: Optional[str] = None
    
    # Optional vendor fields for registration
    vendor_name: Optional[str] = None
    vendor_category: Optional[str] = None
    vendor_gst_number: Optional[str] = None
    vendor_address: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    first_name: str
    last_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    role: UserRole
    vendor_id: Optional[UUID] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ===== VENDOR SCHEMAS =====
class VendorCreate(BaseModel):
    name: str
    category: str
    gst_number: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    address: Optional[str] = None

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    gst_number: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    address: Optional[str] = None
    status: Optional[VendorStatus] = None
    rating: Optional[float] = None

class VendorResponse(BaseModel):
    id: UUID
    name: str
    category: str
    gst_number: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    address: Optional[str] = None
    status: VendorStatus
    rating: float
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class VendorListResponse(BaseModel):
    vendors: List[VendorResponse]
    counts: dict

# ===== RFQ SCHEMAS =====
class RfqLineItemCreate(BaseModel):
    item_name: str
    quantity: float
    unit: Optional[str] = "pcs"

class RfqLineItemResponse(BaseModel):
    id: UUID
    rfq_id: UUID
    item_name: str
    quantity: float
    unit: Optional[str] = None

    class Config:
        from_attributes = True

class RfqVendorResponse(BaseModel):
    id: UUID
    rfq_id: UUID
    vendor_id: UUID
    status: RfqVendorStatus
    invited_at: datetime
    vendor_name: Optional[str] = None

    class Config:
        from_attributes = True

class RfqAttachmentResponse(BaseModel):
    id: UUID
    file_name: str
    file_url: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

class RfqCreate(BaseModel):
    title: str
    category: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[date] = None
    line_items: List[RfqLineItemCreate] = []
    vendor_ids: List[UUID] = []
    publish: Optional[bool] = False

class RfqUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[date] = None

class RfqResponse(BaseModel):
    id: UUID
    rfq_number: str
    title: str
    category: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[date] = None
    status: RfqStatus
    created_by: Optional[UUID] = None
    created_at: datetime
    line_items: List[RfqLineItemResponse] = []
    vendors: List[RfqVendorResponse] = []
    attachments: List[RfqAttachmentResponse] = []

    class Config:
        from_attributes = True

# ===== QUOTATION SCHEMAS =====
class QuotationLineItemCreate(BaseModel):
    item_name: str
    quantity: float
    unit_price: float
    delivery_days: Optional[int] = None

class QuotationLineItemResponse(BaseModel):
    id: UUID
    item_name: str
    quantity: float
    unit_price: float
    total: float
    delivery_days: Optional[int] = None

    class Config:
        from_attributes = True

class QuotationCreate(BaseModel):
    rfq_id: UUID
    line_items: List[QuotationLineItemCreate]
    tax_percent: Optional[float] = 18.0
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    submit: Optional[bool] = False

class QuotationResponse(BaseModel):
    id: UUID
    quotation_number: str
    rfq_id: UUID
    vendor_id: UUID
    status: QuotationStatus
    subtotal: float
    tax_percent: float
    tax_amount: float
    grand_total: float
    delivery_days: Optional[int] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
    line_items: List[QuotationLineItemResponse] = []
    vendor_name: Optional[str] = None
    vendor_rating: Optional[float] = None

    class Config:
        from_attributes = True

# ===== APPROVAL SCHEMAS =====
class ApprovalCreate(BaseModel):
    approver_ids: Optional[List[UUID]] = None

class ApprovalResponse(BaseModel):
    id: UUID
    rfq_id: UUID
    quotation_id: UUID
    level: int
    approver_id: Optional[UUID] = None
    approver_name: Optional[str] = None
    status: ApprovalStatus
    remarks: Optional[str] = None
    acted_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ApprovalAction(BaseModel):
    remarks: Optional[str] = None

# ===== PURCHASE ORDER SCHEMAS =====
class PoLineItemResponse(BaseModel):
    id: UUID
    item_name: str
    quantity: float
    unit_price: float
    total: float

    class Config:
        from_attributes = True

class PurchaseOrderCreate(BaseModel):
    rfq_id: UUID

class PurchaseOrderResponse(BaseModel):
    id: UUID
    po_number: str
    rfq_id: UUID
    quotation_id: UUID
    vendor_id: UUID
    buyer_org_name: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_gstin: Optional[str] = None
    po_date: date
    subtotal: float
    cgst: float
    sgst: float
    igst: float
    grand_total: float
    status: str
    created_by: Optional[UUID] = None
    created_at: datetime
    line_items: List[PoLineItemResponse] = []
    vendor_name: Optional[str] = None

    class Config:
        from_attributes = True

# ===== INVOICE SCHEMAS =====
class InvoiceCreate(BaseModel):
    po_id: UUID

class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    po_id: UUID
    invoice_date: date
    due_date: Optional[date] = None
    subtotal: float
    cgst: float
    sgst: float
    igst: float
    grand_total: float
    status: InvoiceStatus
    pdf_url: Optional[str] = None
    emailed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    po_number: Optional[str] = None
    vendor_name: Optional[str] = None

    class Config:
        from_attributes = True

# ===== DASHBOARD & REPORTS SCHEMAS =====
class DashboardSummary(BaseModel):
    active_rfqs: int
    pending_approvals: int
    po_total_this_month: float
    overdue_invoices: int
    recent_purchase_orders: List[Any] = []
    spend_trend_6m: List[Any] = []

class ReportsAnalytics(BaseModel):
    total_spend: float
    active_vendors: int
    po_fulfillment_pct: float
    overdue_invoices: int
    spend_by_category: List[Any] = []
    top_vendors_by_spend: List[Any] = []
    monthly_trend: List[Any] = []

# ===== ACTIVITY LOG SCHEMAS =====
class ActivityLogResponse(BaseModel):
    id: UUID
    actor_id: Optional[UUID] = None
    actor_name: Optional[str] = None
    entity_type: str
    entity_id: Optional[UUID] = None
    action: str
    description: str
    metadata: Optional[dict] = {}
    created_at: datetime

    class Config:
        from_attributes = True

# ===== NOTIFICATION SCHEMAS =====
class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    type: Optional[str] = None
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ===== ORG SETTINGS SCHEMAS =====
class OrganizationSettingResponse(BaseModel):
    org_name: str
    address: Optional[str] = None
    gstin: Optional[str] = None
    logo_url: Optional[str] = None
    default_tax_percent: float

    class Config:
        from_attributes = True

class OrganizationSettingUpdate(BaseModel):
    org_name: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    logo_url: Optional[str] = None
    default_tax_percent: Optional[float] = None

Token.model_rebuild()
