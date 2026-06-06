import asyncio
import os
import sys
import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy.future import select
from sqlalchemy.sql import text

# Add the backend/ directory to the Python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.session import SessionLocal, engine
from app.core.security import get_password_hash
from app.models.all_models import (
    User, Vendor, Rfq, RfqLineItem, RfqVendor, Quotation, QuotationLineItem,
    Approval, PurchaseOrder, PoLineItem, Invoice, ActivityLog, Notification,
    OrganizationSetting, UserRole, VendorStatus, RfqStatus, RfqVendorStatus,
    QuotationStatus, ApprovalStatus, InvoiceStatus
)

async def seed_data():
    print("Starting database seeding...")
    async with SessionLocal() as db:
        # 1. Truncate all tables
        print("Truncating existing tables...")
        await db.execute(text(
            "TRUNCATE TABLE activity_logs, notifications, organization_settings, doc_counters, "
            "invoices, po_line_items, purchase_orders, approvals, quotation_line_items, "
            "quotations, rfq_attachments, rfq_vendors, rfq_line_items, rfqs, users, vendors CASCADE"
        ))
        await db.commit()

        # 2. Seed Organization Settings
        print("Seeding Organization Settings...")
        org_setting = OrganizationSetting(
            id=uuid.uuid4(),
            org_name="VendorBridge Corp",
            address="123 Procurement Way, Bangalore, KA, India",
            gstin="29AAAAA1111A1Z1",
            default_tax_percent=Decimal("18.00")
        )
        db.add(org_setting)

        # 3. Seed Vendors
        print("Seeding Vendors...")
        vendor_acme = Vendor(
            id=uuid.uuid4(),
            name="Acme Corp",
            category="IT Hardware",
            gst_number="27AAAAA1111A1Z1",
            contact_name="Alice Acme",
            contact_phone="+91 9999911111",
            contact_email="alice@acme.com",
            address="Plot 42, Electronics City, Phase 1, Bangalore, KA, India",
            status=VendorStatus.active,
            rating=Decimal("4.5")
        )
        vendor_global = Vendor(
            id=uuid.uuid4(),
            name="Global Technologies",
            category="IT Hardware",
            gst_number="27BBBBB2222B2Z2",
            contact_name="Bob Global",
            contact_phone="+91 9999922222",
            contact_email="bob@globaltech.com",
            address="Tower B, Tech Park, Hyderabad, TS, India",
            status=VendorStatus.active,
            rating=Decimal("4.2")
        )
        vendor_zenith = Vendor(
            id=uuid.uuid4(),
            name="Zenith Solutions Ltd",
            category="IT Hardware",
            gst_number="27CCCCC3333C3Z3",
            contact_name="Charlie Zenith",
            contact_phone="+91 9999933333",
            contact_email="charlie@zenith.com",
            address="Zenith House, Industrial Area, Pune, MH, India",
            status=VendorStatus.active,
            rating=Decimal("4.8")
        )
        
        db.add_all([vendor_acme, vendor_global, vendor_zenith])
        await db.flush() # Populate IDs

        # 4. Seed Users
        print("Seeding Users...")
        # Password hash for general use
        pwd_hash = get_password_hash("password123")

        user_admin = User(
            id=uuid.uuid4(),
            email="admin@vendorbridge.com",
            password_hash=pwd_hash,
            first_name="Admin",
            last_name="User",
            role=UserRole.admin,
            is_active=True
        )
        user_officer = User(
            id=uuid.uuid4(),
            email="officer@vendorbridge.com",
            password_hash=pwd_hash,
            first_name="Officer",
            last_name="User",
            role=UserRole.procurement_officer,
            is_active=True
        )
        user_manager_priya = User(
            id=uuid.uuid4(),
            email="priya@vendorbridge.com",
            password_hash=pwd_hash,
            first_name="Priya",
            last_name="Sharma",
            role=UserRole.manager,
            is_active=True
        )
        user_manager_rahul = User(
            id=uuid.uuid4(),
            email="rahul@vendorbridge.com",
            password_hash=pwd_hash,
            first_name="Rahul",
            last_name="Verma",
            role=UserRole.manager,
            is_active=True
        )

        # Link vendor users to vendor entities
        user_vendor_acme = User(
            id=uuid.uuid4(),
            email="vendor1@acme.com",
            password_hash=pwd_hash,
            first_name="Alice",
            last_name="Acme",
            role=UserRole.vendor,
            vendor_id=vendor_acme.id,
            is_active=True
        )
        user_vendor_global = User(
            id=uuid.uuid4(),
            email="vendor2@globaltech.com",
            password_hash=pwd_hash,
            first_name="Bob",
            last_name="Global",
            role=UserRole.vendor,
            vendor_id=vendor_global.id,
            is_active=True
        )
        user_vendor_zenith = User(
            id=uuid.uuid4(),
            email="vendor3@zenith.com",
            password_hash=pwd_hash,
            first_name="Charlie",
            last_name="Zenith",
            role=UserRole.vendor,
            vendor_id=vendor_zenith.id,
            is_active=True
        )

        db.add_all([
            user_admin, user_officer, user_manager_priya, user_manager_rahul,
            user_vendor_acme, user_vendor_global, user_vendor_zenith
        ])
        await db.flush()

        # Update vendors' created_by field
        vendor_acme.created_by = user_officer.id
        vendor_global.created_by = user_officer.id
        vendor_zenith.created_by = user_officer.id

        # 5. Seed RFQs, Quotations, Approvals, POs & Invoices
        print("Seeding RFQs...")
        
        # RFQ 1: Under Review / Quotations Received
        rfq1_id = uuid.uuid4()
        rfq1_num = "RFQ-2026-0001"
        rfq1 = Rfq(
            id=rfq1_id,
            rfq_number=rfq1_num,
            title="Laptops for Engineering Team",
            category="IT Hardware",
            description="Procurement of high-performance developer laptops for the core engineering team.",
            deadline=date.today() + timedelta(days=7),
            status=RfqStatus.under_review,
            created_by=user_officer.id
        )
        db.add(rfq1)

        # Line items for RFQ 1
        rfq1_item1 = RfqLineItem(
            id=uuid.uuid4(),
            rfq_id=rfq1_id,
            item_name="Developer Laptop (Intel i7, 32GB RAM, 1TB SSD)",
            quantity=Decimal("10"),
            unit="Nos"
        )
        rfq1_item2 = RfqLineItem(
            id=uuid.uuid4(),
            rfq_id=rfq1_id,
            item_name="27\" 4K IPS Display Monitor",
            quantity=Decimal("5"),
            unit="Nos"
        )
        db.add_all([rfq1_item1, rfq1_item2])

        # Vendor assignments for RFQ 1
        rfq1_v_acme = RfqVendor(
            id=uuid.uuid4(),
            rfq_id=rfq1_id,
            vendor_id=vendor_acme.id,
            status=RfqVendorStatus.quoted
        )
        rfq1_v_global = RfqVendor(
            id=uuid.uuid4(),
            rfq_id=rfq1_id,
            vendor_id=vendor_global.id,
            status=RfqVendorStatus.quoted
        )
        rfq1_v_zenith = RfqVendor(
            id=uuid.uuid4(),
            rfq_id=rfq1_id,
            vendor_id=vendor_zenith.id,
            status=RfqVendorStatus.quoted
        )
        db.add_all([rfq1_v_acme, rfq1_v_global, rfq1_v_zenith])

        # Quotations for RFQ 1
        # Acme Quote (Mid Price, Medium Delivery)
        q_acme_id = uuid.uuid4()
        q_acme = Quotation(
            id=q_acme_id,
            quotation_number="QT-2026-0001",
            rfq_id=rfq1_id,
            vendor_id=vendor_acme.id,
            status=QuotationStatus.submitted,
            subtotal=Decimal("975000.00"),
            tax_percent=Decimal("18.00"),
            tax_amount=Decimal("175500.00"),
            grand_total=Decimal("1150500.00"),
            delivery_days=10,
            payment_terms="30 days net from invoice date",
            notes="Acme Corp standard 3-year warranty included.",
            submitted_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(q_acme)
        db.add_all([
            QuotationLineItem(
                id=uuid.uuid4(), quotation_id=q_acme_id,
                item_name="Developer Laptop (Intel i7, 32GB RAM, 1TB SSD)",
                quantity=Decimal("10"), unit_price=Decimal("85000.00"),
                total=Decimal("850000.00"), delivery_days=10
            ),
            QuotationLineItem(
                id=uuid.uuid4(), quotation_id=q_acme_id,
                item_name="27\" 4K IPS Display Monitor",
                quantity=Decimal("5"), unit_price=Decimal("25000.00"),
                total=Decimal("125000.00"), delivery_days=10
            )
        ])

        # Global Tech Quote (Lowest Price, Slow Delivery)
        q_global_id = uuid.uuid4()
        q_global = Quotation(
            id=q_global_id,
            quotation_number="QT-2026-0002",
            rfq_id=rfq1_id,
            vendor_id=vendor_global.id,
            status=QuotationStatus.submitted,
            subtotal=Decimal("950000.00"),
            tax_percent=Decimal("18.00"),
            tax_amount=Decimal("171000.00"),
            grand_total=Decimal("1121000.00"),
            delivery_days=15,
            payment_terms="45 days net",
            notes="Global Tech premium business support included.",
            submitted_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(q_global)
        db.add_all([
            QuotationLineItem(
                id=uuid.uuid4(), quotation_id=q_global_id,
                item_name="Developer Laptop (Intel i7, 32GB RAM, 1TB SSD)",
                quantity=Decimal("10"), unit_price=Decimal("82000.00"),
                total=Decimal("820000.00"), delivery_days=15
            ),
            QuotationLineItem(
                id=uuid.uuid4(), quotation_id=q_global_id,
                item_name="27\" 4K IPS Display Monitor",
                quantity=Decimal("5"), unit_price=Decimal("26000.00"),
                total=Decimal("130000.00"), delivery_days=15
            )
        ])

        # Zenith Quote (Highest Price, Fastest Delivery)
        q_zenith_id = uuid.uuid4()
        q_zenith = Quotation(
            id=q_zenith_id,
            quotation_number="QT-2026-0003",
            rfq_id=rfq1_id,
            vendor_id=vendor_zenith.id,
            status=QuotationStatus.submitted,
            subtotal=Decimal("1000000.00"),
            tax_percent=Decimal("18.00"),
            tax_amount=Decimal("180000.00"),
            grand_total=Decimal("1180000.00"),
            delivery_days=7,
            payment_terms="15 days net",
            notes="Express shipment. Fastest delivery guaranteed.",
            submitted_at=datetime.utcnow() - timedelta(days=1)
        )
        db.add(q_zenith)
        db.add_all([
            QuotationLineItem(
                id=uuid.uuid4(), quotation_id=q_zenith_id,
                item_name="Developer Laptop (Intel i7, 32GB RAM, 1TB SSD)",
                quantity=Decimal("10"), unit_price=Decimal("88000.00"),
                total=Decimal("880000.00"), delivery_days=7
            ),
            QuotationLineItem(
                id=uuid.uuid4(), quotation_id=q_zenith_id,
                item_name="27\" 4K IPS Display Monitor",
                quantity=Decimal("5"), unit_price=Decimal("24000.00"),
                total=Decimal("120000.00"), delivery_days=7
            )
        ])


        # RFQ 2: Draft state
        rfq2_id = uuid.uuid4()
        rfq2 = Rfq(
            id=rfq2_id,
            rfq_number="RFQ-2026-0002",
            title="Office Ergonomic Chairs",
            category="Furniture",
            description="Requirement for 50 ergonomic office chairs with lumbar support.",
            deadline=date.today() + timedelta(days=14),
            status=RfqStatus.draft,
            created_by=user_officer.id
        )
        db.add(rfq2)
        db.add(RfqLineItem(
            id=uuid.uuid4(),
            rfq_id=rfq2_id,
            item_name="Ergonomic Mesh Chair with Adjustable Armrests",
            quantity=Decimal("50"),
            unit="Nos"
        ))


        # RFQ 3: Closed / Completed (Already Approved -> PO & Invoice Paid)
        rfq3_id = uuid.uuid4()
        rfq3 = Rfq(
            id=rfq3_id,
            rfq_number="RFQ-2026-0003",
            title="Server Rack Cooling Units",
            category="IT Hardware",
            description="Procurement of smart server room cooling system.",
            deadline=date.today() - timedelta(days=10),
            status=RfqStatus.po_generated,
            created_by=user_officer.id
        )
        db.add(rfq3)
        db.add(RfqLineItem(
            id=uuid.uuid4(),
            rfq_id=rfq3_id,
            item_name="Smart Cooling unit 15000 BTU",
            quantity=Decimal("2"),
            unit="Nos"
        ))
        rfq3_v_acme = RfqVendor(
            id=uuid.uuid4(), rfq_id=rfq3_id, vendor_id=vendor_acme.id, status=RfqVendorStatus.quoted
        )
        db.add(rfq3_v_acme)

        # Quote 3 (Selected)
        q3_id = uuid.uuid4()
        q3 = Quotation(
            id=q3_id,
            quotation_number="QT-2026-0004",
            rfq_id=rfq3_id,
            vendor_id=vendor_acme.id,
            status=QuotationStatus.selected,
            subtotal=Decimal("250000.00"),
            tax_percent=Decimal("18.00"),
            tax_amount=Decimal("45000.00"),
            grand_total=Decimal("295000.00"),
            delivery_days=5,
            payment_terms="Immediate on delivery",
            submitted_at=datetime.utcnow() - timedelta(days=12)
        )
        db.add(q3)
        db.add(QuotationLineItem(
            id=uuid.uuid4(), quotation_id=q3_id,
            item_name="Smart Cooling unit 15000 BTU",
            quantity=Decimal("2"), unit_price=Decimal("125000.00"),
            total=Decimal("250000.00"), delivery_days=5
        ))

        # Approvals for Quote 3
        # L1 Approved by Priya
        app1 = Approval(
            id=uuid.uuid4(), rfq_id=rfq3_id, quotation_id=q3_id, level=1,
            approver_id=user_manager_priya.id, approver_name="Priya Sharma",
            status=ApprovalStatus.approved, remarks="Pricing is fair and vendor rating is 4.5. Approved L1.",
            acted_at=datetime.utcnow() - timedelta(days=10)
        )
        # L2 Approved by Rahul
        app2 = Approval(
            id=uuid.uuid4(), rfq_id=rfq3_id, quotation_id=q3_id, level=2,
            approver_id=user_manager_rahul.id, approver_name="Rahul Verma",
            status=ApprovalStatus.approved, remarks="L2 approved. Proceed with PO generation.",
            acted_at=datetime.utcnow() - timedelta(days=9)
        )
        db.add_all([app1, app2])

        # Purchase Order for RFQ 3
        po_id = uuid.uuid4()
        po = PurchaseOrder(
            id=po_id,
            po_number="PO-2026-0001",
            rfq_id=rfq3_id,
            quotation_id=q3_id,
            vendor_id=vendor_acme.id,
            buyer_org_name=org_setting.org_name,
            buyer_address=org_setting.address,
            buyer_gstin=org_setting.gstin,
            po_date=date.today() - timedelta(days=9),
            subtotal=Decimal("250000.00"),
            cgst=Decimal("22500.00"),
            sgst=Decimal("22500.00"),
            igst=Decimal("0.00"),
            grand_total=Decimal("295000.00"),
            status="generated",
            created_by=user_officer.id,
            created_at=datetime.utcnow() - timedelta(days=9)
        )
        db.add(po)
        db.add(PoLineItem(
            id=uuid.uuid4(), po_id=po_id,
            item_name="Smart Cooling unit 15000 BTU",
            quantity=Decimal("2"), unit_price=Decimal("125000.00"),
            total=Decimal("250000.00")
        ))

        # Invoice for PO
        inv_id = uuid.uuid4()
        inv = Invoice(
            id=inv_id,
            invoice_number="INV-2026-0001",
            po_id=po_id,
            invoice_date=date.today() - timedelta(days=8),
            due_date=date.today() + timedelta(days=22),
            subtotal=Decimal("250000.00"),
            cgst=Decimal("22500.00"),
            sgst=Decimal("22500.00"),
            igst=Decimal("0.00"),
            grand_total=Decimal("295000.00"),
            status=InvoiceStatus.paid,
            pdf_url=f"/invoices/INV-2026-0001.pdf",
            emailed_at=datetime.utcnow() - timedelta(days=8),
            paid_at=datetime.utcnow() - timedelta(days=1),
            created_at=datetime.utcnow() - timedelta(days=8)
        )
        db.add(inv)


        # 7. Seed Activity Logs
        print("Seeding Activity Logs...")
        # (Direct insert since activity logs table has immutability triggers but we can insert new items)
        logs = [
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_officer.id, actor_name="Officer User",
                entity_type="rfq", entity_id=rfq3_id, action="created",
                description="Created RFQ RFQ-2026-0003 for Server Rack Cooling Units in Draft status.",
                created_at=datetime.utcnow() - timedelta(days=15)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_officer.id, actor_name="Officer User",
                entity_type="rfq", entity_id=rfq3_id, action="published",
                description="Published RFQ RFQ-2026-0003 and invited Acme Corp.",
                created_at=datetime.utcnow() - timedelta(days=14)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_vendor_acme.id, actor_name="Alice Acme",
                entity_type="quotation", entity_id=q3_id, action="submitted",
                description="Submitted quotation QT-2026-0004 for RFQ RFQ-2026-0003 with grand total Rs. 2,95,000.00.",
                created_at=datetime.utcnow() - timedelta(days=12)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_officer.id, actor_name="Officer User",
                entity_type="quotation", entity_id=q3_id, action="selected",
                description="Selected quotation QT-2026-0004 for RFQ RFQ-2026-0003. Initiated approval workflow.",
                created_at=datetime.utcnow() - timedelta(days=11)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_manager_priya.id, actor_name="Priya Sharma",
                entity_type="approval", entity_id=app1.id, action="approved",
                description="L1 approval granted by Priya Sharma for quotation QT-2026-0004.",
                created_at=datetime.utcnow() - timedelta(days=10)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_manager_rahul.id, actor_name="Rahul Verma",
                entity_type="approval", entity_id=app2.id, action="approved",
                description="L2 final approval granted by Rahul Verma for quotation QT-2026-0004.",
                created_at=datetime.utcnow() - timedelta(days=9)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_officer.id, actor_name="Officer User",
                entity_type="purchase_order", entity_id=po_id, action="generated",
                description="Generated Purchase Order PO-2026-0001 from quotation QT-2026-0004.",
                created_at=datetime.utcnow() - timedelta(days=9)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=None, actor_name="System",
                entity_type="invoice", entity_id=inv_id, action="created",
                description="Generated Invoice INV-2026-0001 for Purchase Order PO-2026-0001.",
                created_at=datetime.utcnow() - timedelta(days=8)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_officer.id, actor_name="Officer User",
                entity_type="invoice", entity_id=inv_id, action="emailed",
                description="Emailed Invoice INV-2026-0001 to vendor contact (alice@acme.com).",
                created_at=datetime.utcnow() - timedelta(days=8)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_officer.id, actor_name="Officer User",
                entity_type="invoice", entity_id=inv_id, action="paid",
                description="Marked Invoice INV-2026-0001 as Paid.",
                created_at=datetime.utcnow() - timedelta(days=1)
            ),
            
            # Logs for RFQ 1
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_officer.id, actor_name="Officer User",
                entity_type="rfq", entity_id=rfq1_id, action="created",
                description="Created RFQ RFQ-2026-0001 (Laptops for Engineering Team) in Draft status.",
                created_at=datetime.utcnow() - timedelta(days=5)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_officer.id, actor_name="Officer User",
                entity_type="rfq", entity_id=rfq1_id, action="published",
                description="Published RFQ RFQ-2026-0001 and invited Acme Corp, Global Technologies, and Zenith Solutions Ltd.",
                created_at=datetime.utcnow() - timedelta(days=4)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_vendor_acme.id, actor_name="Alice Acme",
                entity_type="quotation", entity_id=q_acme_id, action="submitted",
                description="Submitted quotation QT-2026-0001 for RFQ RFQ-2026-0001 (Total: Rs. 11,50,500.00).",
                created_at=datetime.utcnow() - timedelta(days=2)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_vendor_global.id, actor_name="Bob Global",
                entity_type="quotation", entity_id=q_global_id, action="submitted",
                description="Submitted quotation QT-2026-0002 for RFQ RFQ-2026-0001 (Total: Rs. 11,21,000.00).",
                created_at=datetime.utcnow() - timedelta(days=2)
            ),
            ActivityLog(
                id=uuid.uuid4(), actor_id=user_vendor_zenith.id, actor_name="Charlie Zenith",
                entity_type="quotation", entity_id=q_zenith_id, action="submitted",
                description="Submitted quotation QT-2026-0003 for RFQ RFQ-2026-0001 (Total: Rs. 11,80,000.00).",
                created_at=datetime.utcnow() - timedelta(days=1)
            ),
        ]
        db.add_all(logs)

        # 8. Seed Notifications
        print("Seeding Notifications...")
        notifs = [
            Notification(
                id=uuid.uuid4(), user_id=user_manager_priya.id, type="rfq_approval_needed",
                message="Quotation selected for RFQ Laptops for Engineering Team. L1 Approval required.",
                link=f"/approvals", is_read=False, created_at=datetime.utcnow()
            ),
            Notification(
                id=uuid.uuid4(), user_id=user_manager_rahul.id, type="rfq_approval_needed",
                message="Quotation selected for RFQ Laptops for Engineering Team. L2 Approval required.",
                link=f"/approvals", is_read=False, created_at=datetime.utcnow()
            ),
            Notification(
                id=uuid.uuid4(), user_id=user_officer.id, type="invoice_paid",
                message="Invoice INV-2026-0001 has been marked as PAID.",
                link=f"/invoices", is_read=True, created_at=datetime.utcnow() - timedelta(days=1)
            )
        ]
        db.add_all(notifs)

        await db.commit()
        print("Database seeding completed successfully!")

if __name__ == "__main__":
    # Workaround for insert query mapping in doc_counters since it's raw text
    async def run_all():
        await seed_data()
        
        # Raw sql insert for doc_counters since it has no sqlalchemy model (managed via triggers/functions)
        async with SessionLocal() as db:
            print("Verifying counters...")
            await db.execute(text("DELETE FROM doc_counters"))
            await db.execute(text(
                "INSERT INTO doc_counters (doc_type, year, last_seq) VALUES "
                "('rfq', 2026, 2), "
                "('quotation', 2026, 4), "
                "('purchase_order', 2026, 1), "
                "('invoice', 2026, 1)"
            ))
            await db.commit()
            print("Counters successfully seeded.")

    asyncio.run(run_all())
