import enum
from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import Column, String, Boolean, Numeric, Integer, ForeignKey, DateTime, Date, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base

# ===== ENUMS =====
class UserRole(str, enum.Enum):
    admin = "admin"
    procurement_officer = "procurement_officer"
    manager = "manager"
    vendor = "vendor"

class VendorStatus(str, enum.Enum):
    active = "active"
    pending = "pending"
    blocked = "blocked"

class RfqStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    quotations_received = "quotations_received"
    under_review = "under_review"
    approved = "approved"
    po_generated = "po_generated"
    closed = "closed"
    cancelled = "cancelled"

class RfqVendorStatus(str, enum.Enum):
    invited = "invited"
    quoted = "quoted"
    declined = "declined"

class QuotationStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    selected = "selected"
    rejected = "rejected"

class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class InvoiceStatus(str, enum.Enum):
    pending_payment = "pending_payment"
    paid = "paid"
    overdue = "overdue"

# ===== MODELS =====

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    country = Column(String, nullable=True)
    role = Column(ENUM(UserRole, name="user_role"), nullable=False, default=UserRole.procurement_officer)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True)
    additional_info = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    vendor = relationship("Vendor", foreign_keys=[vendor_id], back_populates="users")
    created_vendors = relationship("Vendor", back_populates="creator", foreign_keys="[Vendor.created_by]")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    gst_number = Column(String, nullable=True)
    contact_name = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    status = Column(ENUM(VendorStatus, name="vendor_status"), nullable=False, default=VendorStatus.pending)
    rating = Column(Numeric(2, 1), nullable=True, default=0.0)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_vendors")
    users = relationship("User", foreign_keys=[User.vendor_id], back_populates="vendor")
    rfq_assignments = relationship("RfqVendor", back_populates="vendor", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="vendor", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")


class Rfq(Base):
    __tablename__ = "rfqs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_number = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    deadline = Column(Date, nullable=True)
    status = Column(ENUM(RfqStatus, name="rfq_status"), nullable=False, default=RfqStatus.draft)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    line_items = relationship("RfqLineItem", back_populates="rfq", cascade="all, delete-orphan")
    vendors = relationship("RfqVendor", back_populates="rfq", cascade="all, delete-orphan")
    attachments = relationship("RfqAttachment", back_populates="rfq", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="rfq", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="rfq", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="rfq")


class RfqLineItem(Base):
    __tablename__ = "rfq_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String, nullable=False)
    quantity = Column(Numeric, nullable=False, default=1)
    unit = Column(String, nullable=True)

    rfq = relationship("Rfq", back_populates="line_items")


class RfqVendor(Base):
    __tablename__ = "rfq_vendors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    status = Column(ENUM(RfqVendorStatus, name="rfq_vendor_status"), nullable=False, default=RfqVendorStatus.invited)
    invited_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    rfq = relationship("Rfq", back_populates="vendors")
    vendor = relationship("Vendor", back_populates="rfq_assignments")


class RfqAttachment(Base):
    __tablename__ = "rfq_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    rfq = relationship("Rfq", back_populates="attachments")


class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_number = Column(String, unique=True, nullable=False)
    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    status = Column(ENUM(QuotationStatus, name="quotation_status"), nullable=False, default=QuotationStatus.draft)
    subtotal = Column(Numeric, nullable=False, default=0)
    tax_percent = Column(Numeric, nullable=False, default=18)
    tax_amount = Column(Numeric, nullable=False, default=0)
    grand_total = Column(Numeric, nullable=False, default=0)
    delivery_days = Column(Integer, nullable=True)
    payment_terms = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    rfq = relationship("Rfq", back_populates="quotations")
    vendor = relationship("Vendor", back_populates="quotations")
    line_items = relationship("QuotationLineItem", back_populates="quotation", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="quotation", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="quotation")


class QuotationLineItem(Base):
    __tablename__ = "quotation_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_id = Column(UUID(as_uuid=True), ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String, nullable=False)
    quantity = Column(Numeric, nullable=False, default=1)
    unit_price = Column(Numeric, nullable=False, default=0)
    total = Column(Numeric, nullable=False, default=0)
    delivery_days = Column(Integer, nullable=True)

    quotation = relationship("Quotation", back_populates="line_items")


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    quotation_id = Column(UUID(as_uuid=True), ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)
    level = Column(Integer, nullable=False)
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approver_name = Column(String, nullable=True)
    status = Column(ENUM(ApprovalStatus, name="approval_status"), nullable=False, default=ApprovalStatus.pending)
    remarks = Column(Text, nullable=True)
    acted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    rfq = relationship("Rfq", back_populates="approvals")
    quotation = relationship("Quotation", back_populates="approvals")
    approver = relationship("User", foreign_keys=[approver_id])


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_number = Column(String, unique=True, nullable=False)
    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False)
    quotation_id = Column(UUID(as_uuid=True), ForeignKey("quotations.id"), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    buyer_org_name = Column(String, nullable=True)
    buyer_address = Column(Text, nullable=True)
    buyer_gstin = Column(String, nullable=True)
    po_date = Column(Date, nullable=False, default=date.today)
    subtotal = Column(Numeric, nullable=False, default=0)
    cgst = Column(Numeric, nullable=False, default=0)
    sgst = Column(Numeric, nullable=False, default=0)
    igst = Column(Numeric, nullable=False, default=0)
    grand_total = Column(Numeric, nullable=False, default=0)
    status = Column(String, nullable=False, default="generated")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    rfq = relationship("Rfq", back_populates="purchase_orders")
    quotation = relationship("Quotation", back_populates="purchase_orders")
    vendor = relationship("Vendor", back_populates="purchase_orders")
    creator = relationship("User", foreign_keys=[created_by])
    line_items = relationship("PoLineItem", back_populates="po", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="po", cascade="all, delete-orphan")


class PoLineItem(Base):
    __tablename__ = "po_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String, nullable=False)
    quantity = Column(Numeric, nullable=False, default=1)
    unit_price = Column(Numeric, nullable=False, default=0)
    total = Column(Numeric, nullable=False, default=0)

    po = relationship("PurchaseOrder", back_populates="line_items")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_number = Column(String, unique=True, nullable=False)
    po_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=False)
    invoice_date = Column(Date, nullable=False, default=date.today)
    due_date = Column(Date, nullable=True)
    subtotal = Column(Numeric, nullable=False, default=0)
    cgst = Column(Numeric, nullable=False, default=0)
    sgst = Column(Numeric, nullable=False, default=0)
    igst = Column(Numeric, nullable=False, default=0)
    grand_total = Column(Numeric, nullable=False, default=0)
    status = Column(ENUM(InvoiceStatus, name="invoice_status"), nullable=False, default=InvoiceStatus.pending_payment)
    pdf_url = Column(String, nullable=True)
    emailed_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationships
    po = relationship("PurchaseOrder", back_populates="invoices")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    actor_name = Column(String, nullable=True)
    entity_type = Column(String, nullable=False) # rfq | quotation | approval | purchase_order | invoice | vendor
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    action = Column(String, nullable=False) # created | published | submitted | selected | approved ...
    description = Column(Text, nullable=False)
    log_metadata = Column("metadata", JSONB, nullable=True, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    actor = relationship("User", foreign_keys=[actor_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    link = Column(String, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class OrganizationSetting(Base):
    __tablename__ = "organization_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_name = Column(String, nullable=False, default="Your Organization")
    address = Column(Text, nullable=True)
    gstin = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    default_tax_percent = Column(Numeric, nullable=False, default=18)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
