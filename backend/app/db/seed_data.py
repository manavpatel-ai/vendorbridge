"""
Seed script for VendorBridge.
Creates admin user, sample users, vendors, RFQs, quotations, approvals, POs, invoices, activity logs, and notifications.

Usage:
    cd backend
    python -m app.db.seed_data
"""

import asyncio
import sys
import os
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import asyncpg

# ---------- CONFIG ----------
DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:jfjanfhhePVNwzTisFhuNZETONuXdaFE@acela.proxy.rlwy.net:28279/railway"
)

# Ensure we use raw postgresql:// for asyncpg (not sqlalchemy's postgresql+asyncpg://)
if DB_URL.startswith("postgresql+asyncpg://"):
    DB_URL = DB_URL.replace("postgresql+asyncpg://", "postgresql://", 1)

# ---------- PASSWORD HASHING ----------
import bcrypt

def hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

# ---------- FIXED UUIDs (for referential integrity) ----------
# Users
ADMIN_ID        = uuid4()
PROC_OFFICER_ID = uuid4()
MANAGER_ID      = uuid4()
VENDOR_USER_1   = uuid4()
VENDOR_USER_2   = uuid4()
VENDOR_USER_3   = uuid4()

# Vendors
VENDOR_1_ID = uuid4()
VENDOR_2_ID = uuid4()
VENDOR_3_ID = uuid4()
VENDOR_4_ID = uuid4()
VENDOR_5_ID = uuid4()

# RFQs
RFQ_1_ID = uuid4()
RFQ_2_ID = uuid4()
RFQ_3_ID = uuid4()
RFQ_4_ID = uuid4()
RFQ_5_ID = uuid4()
RFQ_6_ID = uuid4()

# Quotations
QT_1_ID = uuid4()
QT_2_ID = uuid4()
QT_3_ID = uuid4()
QT_4_ID = uuid4()
QT_5_ID = uuid4()
QT_6_ID = uuid4()

# Purchase Orders
PO_1_ID = uuid4()
PO_2_ID = uuid4()
PO_3_ID = uuid4()
PO_4_ID = uuid4()

# Invoices
INV_1_ID = uuid4()
INV_2_ID = uuid4()
INV_3_ID = uuid4()
INV_4_ID = uuid4()


async def seed():
    print("🌱 Connecting to database...")
    conn = await asyncpg.connect(DB_URL)

    # ---------- CLEAN EXISTING DATA ----------
    print("🧹 Cleaning existing data...")
    await conn.execute("DELETE FROM notifications")
    # activity_logs has an immutable trigger, so we disable it temporarily
    await conn.execute("ALTER TABLE activity_logs DISABLE TRIGGER trg_logs_no_update")
    await conn.execute("ALTER TABLE activity_logs DISABLE TRIGGER trg_logs_no_delete")
    await conn.execute("DELETE FROM activity_logs")
    await conn.execute("ALTER TABLE activity_logs ENABLE TRIGGER trg_logs_no_update")
    await conn.execute("ALTER TABLE activity_logs ENABLE TRIGGER trg_logs_no_delete")
    await conn.execute("DELETE FROM po_line_items")
    await conn.execute("DELETE FROM invoices")
    await conn.execute("DELETE FROM purchase_orders")
    await conn.execute("DELETE FROM approvals")
    await conn.execute("DELETE FROM quotation_line_items")
    await conn.execute("DELETE FROM quotations")
    await conn.execute("DELETE FROM rfq_attachments")
    await conn.execute("DELETE FROM rfq_vendors")
    await conn.execute("DELETE FROM rfq_line_items")
    await conn.execute("DELETE FROM rfqs")
    await conn.execute("UPDATE users SET vendor_id = NULL")
    await conn.execute("DELETE FROM vendors")
    await conn.execute("DELETE FROM users")
    await conn.execute("DELETE FROM doc_counters")
    print("   ✅ Data cleaned.")

    now = datetime.now(timezone.utc)

    # ==================== USERS ====================
    print("👤 Creating users...")
    admin_pw = hash_pw("admin123")
    proc_pw  = hash_pw("officer123")
    mgr_pw   = hash_pw("manager123")
    v1_pw    = hash_pw("vendor123")
    v2_pw    = hash_pw("vendor123")
    v3_pw    = hash_pw("vendor123")

    users = [
        (ADMIN_ID,        "admin@vendorbridge.com",    admin_pw, "Rajesh",   "Kumar",     "+91-9876543210", "India", "admin",               None, True, now, now),
        (PROC_OFFICER_ID, "procurement@vendorbridge.com", proc_pw, "Priya",  "Sharma",    "+91-9876543211", "India", "procurement_officer",  None, True, now, now),
        (MANAGER_ID,      "manager@vendorbridge.com",  mgr_pw,   "Vikram",  "Singh",     "+91-9876543212", "India", "manager",              None, True, now, now),
        (VENDOR_USER_1,   "contact@technoserv.in",     v1_pw,    "Amit",    "Patel",     "+91-9876543213", "India", "vendor",               VENDOR_1_ID, True, now, now),
        (VENDOR_USER_2,   "sales@globalfurnish.com",   v2_pw,    "Sneha",   "Reddy",     "+91-9876543214", "India", "vendor",               VENDOR_2_ID, True, now, now),
        (VENDOR_USER_3,   "info@swiftlogistics.in",    v3_pw,    "Karan",   "Mehta",     "+91-9876543215", "India", "vendor",               VENDOR_3_ID, True, now, now),
    ]

    # Insert users WITHOUT vendor_id first (vendor FK not yet created)
    for u in users:
        await conn.execute(
            """INSERT INTO users (id, email, password_hash, first_name, last_name, phone, country, role, vendor_id, is_active, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8::user_role,NULL,$9,$10,$11)""",
            u[0], u[1], u[2], u[3], u[4], u[5], u[6], u[7], u[9], u[10], u[11]
        )
    print("   ✅ 6 users created.")

    # ==================== VENDORS ====================
    print("🏢 Creating vendors...")
    vendors = [
        (VENDOR_1_ID, "TechnoServ Solutions",      "IT Hardware",    "29AABCT1234F1Z5", "Amit Patel",     "+91-9876543213", "contact@technoserv.in",     "Plot 45, Electronic City, Bangalore, KA",        "active",  Decimal("4.5"), ADMIN_ID, now, now),
        (VENDOR_2_ID, "Global Furnish Pvt Ltd",    "Furniture",      "27AABCG5678H1Z3", "Sneha Reddy",    "+91-9876543214", "sales@globalfurnish.com",   "Unit 12, Industrial Park, Hyderabad, TS",         "active",  Decimal("4.2"), ADMIN_ID, now, now),
        (VENDOR_3_ID, "Swift Logistics India",     "Logistics",      "33AABCS9012J1Z1", "Karan Mehta",    "+91-9876543215", "info@swiftlogistics.in",    "Warehouse 7, Chennai Port Area, TN",              "active",  Decimal("3.8"), ADMIN_ID, now, now),
        (VENDOR_4_ID, "BuildRight Construction",   "Construction",   "07AABCB3456K1Z9", "Deepak Verma",   "+91-9876543216", "bids@buildright.co.in",     "Sector 62, Noida, UP",                            "active",  Decimal("4.0"), ADMIN_ID, now, now),
        (VENDOR_5_ID, "PenPaper Stationery Co",    "Stationery",     "24AABCP7890L1Z7", "Meera Joshi",    "+91-9876543217", "orders@penpaper.in",        "MG Road, Pune, MH",                               "pending", Decimal("0.0"), ADMIN_ID, now, now),
    ]

    for v in vendors:
        await conn.execute(
            """INSERT INTO vendors (id, name, category, gst_number, contact_name, contact_phone, contact_email, address, status, rating, created_by, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::vendor_status,$10,$11,$12,$13)""",
            *v
        )

    # Now update vendor_id for vendor users
    await conn.execute("UPDATE users SET vendor_id=$1 WHERE id=$2", VENDOR_1_ID, VENDOR_USER_1)
    await conn.execute("UPDATE users SET vendor_id=$1 WHERE id=$2", VENDOR_2_ID, VENDOR_USER_2)
    await conn.execute("UPDATE users SET vendor_id=$1 WHERE id=$2", VENDOR_3_ID, VENDOR_USER_3)
    print("   ✅ 5 vendors created.")

    # ==================== RFQs ====================
    print("📋 Creating RFQs...")
    today = date.today()
    rfqs = [
        # RFQ-1: PO generated (completed flow)
        (RFQ_1_ID, "RFQ-2026-0001", "Dell Laptops & Monitors Procurement",       "IT Hardware",    "Bulk purchase of 50 Dell Latitude 5540 laptops and 50 Dell P2723QE monitors for new office expansion.", today - timedelta(days=45), "po_generated",         PROC_OFFICER_ID, now - timedelta(days=45), now - timedelta(days=10)),
        # RFQ-2: Approved (ready for PO)
        (RFQ_2_ID, "RFQ-2026-0002", "Office Furniture - Standing Desks",         "Furniture",      "Ergonomic standing desks with dual monitor arms for 30 workstations. Prefer height-adjustable models.", today - timedelta(days=20), "approved",             PROC_OFFICER_ID, now - timedelta(days=30), now - timedelta(days=5)),
        # RFQ-3: Under review
        (RFQ_3_ID, "RFQ-2026-0003", "Warehouse Logistics & Shipping Services",   "Logistics",      "Annual logistics contract for warehouse-to-office delivery across 5 locations in South India.",          today + timedelta(days=10), "under_review",         PROC_OFFICER_ID, now - timedelta(days=15), now - timedelta(days=3)),
        # RFQ-4: Published (active, waiting for quotes)
        (RFQ_4_ID, "RFQ-2026-0004", "Office Renovation - Civil Works",           "Construction",   "Complete renovation of 3rd floor including false ceiling, flooring, and electrical rewiring.",            today + timedelta(days=20), "published",            PROC_OFFICER_ID, now - timedelta(days=7),  now - timedelta(days=7)),
        # RFQ-5: Quotations received
        (RFQ_5_ID, "RFQ-2026-0005", "Stationery & Office Supplies Q3 2026",      "Stationery",     "Quarterly bulk order of A4 paper, printer cartridges, pens, notebooks, and binding supplies.",            today + timedelta(days=15), "quotations_received",  PROC_OFFICER_ID, now - timedelta(days=10), now - timedelta(days=2)),
        # RFQ-6: Draft
        (RFQ_6_ID, "RFQ-2026-0006", "Network Equipment Upgrade",                 "IT Hardware",    "Cisco switches, access points, and cabling for campus network refresh.",                                  today + timedelta(days=30), "draft",                PROC_OFFICER_ID, now - timedelta(days=1),  now - timedelta(days=1)),
    ]

    for r in rfqs:
        await conn.execute(
            """INSERT INTO rfqs (id, rfq_number, title, category, description, deadline, status, created_by, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7::rfq_status,$8,$9,$10)""",
            *r
        )
    print("   ✅ 6 RFQs created.")

    # ==================== RFQ LINE ITEMS ====================
    print("📦 Creating RFQ line items...")
    rfq_items = [
        # RFQ-1 items
        (uuid4(), RFQ_1_ID, "Dell Latitude 5540 Laptop",      50, "units"),
        (uuid4(), RFQ_1_ID, "Dell P2723QE 27\" 4K Monitor",   50, "units"),
        (uuid4(), RFQ_1_ID, "Laptop Carry Bags",              50, "units"),
        # RFQ-2 items
        (uuid4(), RFQ_2_ID, "Height-Adjustable Standing Desk", 30, "units"),
        (uuid4(), RFQ_2_ID, "Dual Monitor Arm Mount",          30, "units"),
        (uuid4(), RFQ_2_ID, "Cable Management Tray",           30, "units"),
        # RFQ-3 items
        (uuid4(), RFQ_3_ID, "Monthly Logistics Service",       12, "months"),
        (uuid4(), RFQ_3_ID, "Packaging Materials",           500, "kg"),
        # RFQ-4 items
        (uuid4(), RFQ_4_ID, "False Ceiling Installation",    2500, "sq ft"),
        (uuid4(), RFQ_4_ID, "Vinyl Flooring",                2500, "sq ft"),
        (uuid4(), RFQ_4_ID, "Electrical Rewiring",              1, "lot"),
        # RFQ-5 items
        (uuid4(), RFQ_5_ID, "A4 Copier Paper (500 sheets)",  200, "reams"),
        (uuid4(), RFQ_5_ID, "HP 78A Toner Cartridge",         20, "units"),
        (uuid4(), RFQ_5_ID, "Ball Point Pens (Pack of 10)",   50, "packs"),
        (uuid4(), RFQ_5_ID, "Spiral Notebooks (A5, 200pg)",  100, "units"),
        # RFQ-6 items
        (uuid4(), RFQ_6_ID, "Cisco Catalyst 9200 Switch",     10, "units"),
        (uuid4(), RFQ_6_ID, "Cisco Aironet AP",               25, "units"),
        (uuid4(), RFQ_6_ID, "Cat6A Ethernet Cable",         2000, "meters"),
    ]

    for item in rfq_items:
        await conn.execute(
            """INSERT INTO rfq_line_items (id, rfq_id, item_name, quantity, unit)
               VALUES ($1,$2,$3,$4,$5)""",
            item[0], item[1], item[2], Decimal(str(item[3])), item[4]
        )
    print("   ✅ 18 RFQ line items created.")

    # ==================== RFQ VENDORS (invitations) ====================
    print("📨 Creating RFQ vendor invitations...")
    rfq_vendors = [
        (uuid4(), RFQ_1_ID, VENDOR_1_ID, "quoted",   now - timedelta(days=44)),
        (uuid4(), RFQ_2_ID, VENDOR_2_ID, "quoted",   now - timedelta(days=29)),
        (uuid4(), RFQ_3_ID, VENDOR_3_ID, "quoted",   now - timedelta(days=14)),
        (uuid4(), RFQ_3_ID, VENDOR_1_ID, "invited",  now - timedelta(days=14)),
        (uuid4(), RFQ_4_ID, VENDOR_4_ID, "invited",  now - timedelta(days=6)),
        (uuid4(), RFQ_4_ID, VENDOR_1_ID, "invited",  now - timedelta(days=6)),
        (uuid4(), RFQ_5_ID, VENDOR_5_ID, "quoted",   now - timedelta(days=9)),
        (uuid4(), RFQ_5_ID, VENDOR_2_ID, "quoted",   now - timedelta(days=9)),
    ]

    for rv in rfq_vendors:
        await conn.execute(
            """INSERT INTO rfq_vendors (id, rfq_id, vendor_id, status, invited_at)
               VALUES ($1,$2,$3,$4::rfq_vendor_status,$5)""",
            *rv
        )
    print("   ✅ 8 RFQ-vendor invitations created.")

    # ==================== QUOTATIONS ====================
    print("💰 Creating quotations...")
    quotations = [
        # QT-1: Selected quotation for RFQ-1 (TechnoServ – IT Hardware)
        (QT_1_ID, "QT-2026-0001", RFQ_1_ID, VENDOR_1_ID, "selected",
         Decimal("4250000"), Decimal("18"), Decimal("765000"), Decimal("5015000"),
         14, "Net 30 days", "Includes 3-year warranty on all laptops.",
         now - timedelta(days=40), now - timedelta(days=42), now - timedelta(days=35)),
        # QT-2: Selected quotation for RFQ-2 (Global Furnish – Furniture)
        (QT_2_ID, "QT-2026-0002", RFQ_2_ID, VENDOR_2_ID, "selected",
         Decimal("1080000"), Decimal("18"), Decimal("194400"), Decimal("1274400"),
         21, "50% advance, 50% on delivery", "Free installation included.",
         now - timedelta(days=22), now - timedelta(days=25), now - timedelta(days=18)),
        # QT-3: Submitted quotation for RFQ-3 (Swift Logistics)
        (QT_3_ID, "QT-2026-0003", RFQ_3_ID, VENDOR_3_ID, "submitted",
         Decimal("2400000"), Decimal("18"), Decimal("432000"), Decimal("2832000"),
         7, "Monthly billing", "Covers 5 locations as specified in RFQ.",
         now - timedelta(days=10), now - timedelta(days=12), now - timedelta(days=8)),
        # QT-4: Submitted quotation for RFQ-5 (PenPaper – Stationery)
        (QT_4_ID, "QT-2026-0004", RFQ_5_ID, VENDOR_5_ID, "submitted",
         Decimal("85000"), Decimal("18"), Decimal("15300"), Decimal("100300"),
         5, "Net 15 days", "Bulk discount applied.",
         now - timedelta(days=6), now - timedelta(days=8), now - timedelta(days=5)),
        # QT-5: Submitted quotation for RFQ-5 (Global Furnish – competing quote)
        (QT_5_ID, "QT-2026-0005", RFQ_5_ID, VENDOR_2_ID, "submitted",
         Decimal("92000"), Decimal("18"), Decimal("16560"), Decimal("108560"),
         3, "Net 30 days", "Premium quality brands.",
         now - timedelta(days=5), now - timedelta(days=7), now - timedelta(days=4)),
        # QT-6: Rejected quotation for RFQ-1 (higher price alternative – not used, but shows comparison)
        (QT_6_ID, "QT-2026-0006", RFQ_2_ID, VENDOR_4_ID, "rejected",
         Decimal("1350000"), Decimal("18"), Decimal("243000"), Decimal("1593000"),
         30, "Net 45 days", "Includes premium materials.",
         now - timedelta(days=20), now - timedelta(days=24), now - timedelta(days=17)),
    ]

    for q in quotations:
        await conn.execute(
            """INSERT INTO quotations (id, quotation_number, rfq_id, vendor_id, status, subtotal, tax_percent, tax_amount, grand_total, delivery_days, payment_terms, notes, submitted_at, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5::quotation_status,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)""",
            *q
        )
    print("   ✅ 6 quotations created.")

    # ==================== QUOTATION LINE ITEMS ====================
    print("📝 Creating quotation line items...")
    qt_items = [
        # QT-1 line items (IT Hardware)
        (uuid4(), QT_1_ID, "Dell Latitude 5540 Laptop",    Decimal("50"), Decimal("72000"),  Decimal("3600000"), 14),
        (uuid4(), QT_1_ID, "Dell P2723QE 27\" 4K Monitor", Decimal("50"), Decimal("12000"),  Decimal("600000"),  14),
        (uuid4(), QT_1_ID, "Laptop Carry Bags",            Decimal("50"), Decimal("1000"),   Decimal("50000"),   7),
        # QT-2 line items (Furniture)
        (uuid4(), QT_2_ID, "Height-Adjustable Standing Desk", Decimal("30"), Decimal("28000"), Decimal("840000"), 21),
        (uuid4(), QT_2_ID, "Dual Monitor Arm Mount",          Decimal("30"), Decimal("5000"),  Decimal("150000"), 14),
        (uuid4(), QT_2_ID, "Cable Management Tray",           Decimal("30"), Decimal("3000"),  Decimal("90000"),  14),
        # QT-3 line items (Logistics)
        (uuid4(), QT_3_ID, "Monthly Logistics Service",       Decimal("12"), Decimal("180000"), Decimal("2160000"), 7),
        (uuid4(), QT_3_ID, "Packaging Materials",             Decimal("500"), Decimal("480"),   Decimal("240000"),  7),
        # QT-4 line items (Stationery – PenPaper)
        (uuid4(), QT_4_ID, "A4 Copier Paper (500 sheets)",   Decimal("200"), Decimal("250"),  Decimal("50000"),  5),
        (uuid4(), QT_4_ID, "HP 78A Toner Cartridge",         Decimal("20"),  Decimal("1200"), Decimal("24000"),  5),
        (uuid4(), QT_4_ID, "Ball Point Pens (Pack of 10)",   Decimal("50"),  Decimal("120"),  Decimal("6000"),   3),
        (uuid4(), QT_4_ID, "Spiral Notebooks (A5, 200pg)",   Decimal("100"), Decimal("50"),   Decimal("5000"),   3),
        # QT-5 line items (Stationery – Global Furnish competing)
        (uuid4(), QT_5_ID, "A4 Copier Paper (500 sheets)",   Decimal("200"), Decimal("280"),  Decimal("56000"),  3),
        (uuid4(), QT_5_ID, "HP 78A Toner Cartridge",         Decimal("20"),  Decimal("1350"), Decimal("27000"),  3),
        (uuid4(), QT_5_ID, "Ball Point Pens (Pack of 10)",   Decimal("50"),  Decimal("100"),  Decimal("5000"),   2),
        (uuid4(), QT_5_ID, "Spiral Notebooks (A5, 200pg)",   Decimal("100"), Decimal("40"),   Decimal("4000"),   2),
        # QT-6 line items (Furniture – BuildRight rejected)
        (uuid4(), QT_6_ID, "Height-Adjustable Standing Desk", Decimal("30"), Decimal("35000"), Decimal("1050000"), 30),
        (uuid4(), QT_6_ID, "Dual Monitor Arm Mount",          Decimal("30"), Decimal("6500"),  Decimal("195000"),  21),
        (uuid4(), QT_6_ID, "Cable Management Tray",           Decimal("30"), Decimal("3500"),  Decimal("105000"),  21),
    ]

    for qi in qt_items:
        await conn.execute(
            """INSERT INTO quotation_line_items (id, quotation_id, item_name, quantity, unit_price, total, delivery_days)
               VALUES ($1,$2,$3,$4,$5,$6,$7)""",
            *qi
        )
    print("   ✅ 19 quotation line items created.")

    # ==================== APPROVALS ====================
    print("✅ Creating approvals...")
    approvals = [
        # RFQ-1 approvals (both levels approved)
        (uuid4(), RFQ_1_ID, QT_1_ID, 1, MANAGER_ID, "Vikram Singh", "approved", "Pricing looks competitive. Approved.", now - timedelta(days=32), now - timedelta(days=38)),
        (uuid4(), RFQ_1_ID, QT_1_ID, 2, ADMIN_ID,   "Rajesh Kumar", "approved", "Budget approved. Proceed with PO.", now - timedelta(days=28), now - timedelta(days=38)),
        # RFQ-2 approvals (both levels approved)
        (uuid4(), RFQ_2_ID, QT_2_ID, 1, MANAGER_ID, "Vikram Singh", "approved", "Good value. Installation included is a plus.", now - timedelta(days=12), now - timedelta(days=16)),
        (uuid4(), RFQ_2_ID, QT_2_ID, 2, ADMIN_ID,   "Rajesh Kumar", "approved", "Approved. Ensure delivery by month-end.", now - timedelta(days=8), now - timedelta(days=16)),
        # RFQ-3 approvals (L1 pending – under review)
        (uuid4(), RFQ_3_ID, QT_3_ID, 1, MANAGER_ID, "Vikram Singh", "pending", None, None, now - timedelta(days=6)),
        (uuid4(), RFQ_3_ID, QT_3_ID, 2, ADMIN_ID,   "Rajesh Kumar", "pending", None, None, now - timedelta(days=6)),
    ]

    for a in approvals:
        await conn.execute(
            """INSERT INTO approvals (id, rfq_id, quotation_id, level, approver_id, approver_name, status, remarks, acted_at, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7::approval_status,$8,$9,$10)""",
            *a
        )
    print("   ✅ 6 approvals created.")

    # ==================== PURCHASE ORDERS ====================
    print("🛒 Creating purchase orders...")
    purchase_orders = [
        # PO-1 for RFQ-1 (IT Hardware – big one)
        (PO_1_ID, "PO-2026-0001", RFQ_1_ID, QT_1_ID, VENDOR_1_ID,
         "VendorBridge Corp", "123 Procurement Way, Bangalore, KA, India", "29AAAAA1111A1Z1",
         today - timedelta(days=25),
         Decimal("4250000"), Decimal("382500"), Decimal("382500"), Decimal("0"), Decimal("5015000"),
         "generated", PROC_OFFICER_ID, now - timedelta(days=25)),
        # PO-2 for RFQ-2 (Furniture)
        (PO_2_ID, "PO-2026-0002", RFQ_2_ID, QT_2_ID, VENDOR_2_ID,
         "VendorBridge Corp", "123 Procurement Way, Bangalore, KA, India", "29AAAAA1111A1Z1",
         today - timedelta(days=5),
         Decimal("1080000"), Decimal("97200"), Decimal("97200"), Decimal("0"), Decimal("1274400"),
         "generated", PROC_OFFICER_ID, now - timedelta(days=5)),
        # PO-3 older – last month (for spend trend)
        (PO_3_ID, "PO-2026-0003", RFQ_1_ID, QT_1_ID, VENDOR_1_ID,
         "VendorBridge Corp", "123 Procurement Way, Bangalore, KA, India", "29AAAAA1111A1Z1",
         today - timedelta(days=55),
         Decimal("750000"), Decimal("67500"), Decimal("67500"), Decimal("0"), Decimal("885000"),
         "generated", PROC_OFFICER_ID, now - timedelta(days=55)),
        # PO-4 two months ago (for spend trend)
        (PO_4_ID, "PO-2026-0004", RFQ_2_ID, QT_2_ID, VENDOR_2_ID,
         "VendorBridge Corp", "123 Procurement Way, Bangalore, KA, India", "29AAAAA1111A1Z1",
         today - timedelta(days=85),
         Decimal("320000"), Decimal("28800"), Decimal("28800"), Decimal("0"), Decimal("377600"),
         "generated", PROC_OFFICER_ID, now - timedelta(days=85)),
    ]

    for po in purchase_orders:
        await conn.execute(
            """INSERT INTO purchase_orders (id, po_number, rfq_id, quotation_id, vendor_id, buyer_org_name, buyer_address, buyer_gstin, po_date, subtotal, cgst, sgst, igst, grand_total, status, created_by, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)""",
            *po
        )
    print("   ✅ 4 purchase orders created.")

    # ==================== PO LINE ITEMS ====================
    print("📋 Creating PO line items...")
    po_items = [
        # PO-1
        (uuid4(), PO_1_ID, "Dell Latitude 5540 Laptop",    Decimal("50"), Decimal("72000"),  Decimal("3600000")),
        (uuid4(), PO_1_ID, "Dell P2723QE 27\" 4K Monitor", Decimal("50"), Decimal("12000"),  Decimal("600000")),
        (uuid4(), PO_1_ID, "Laptop Carry Bags",            Decimal("50"), Decimal("1000"),   Decimal("50000")),
        # PO-2
        (uuid4(), PO_2_ID, "Height-Adjustable Standing Desk", Decimal("30"), Decimal("28000"), Decimal("840000")),
        (uuid4(), PO_2_ID, "Dual Monitor Arm Mount",          Decimal("30"), Decimal("5000"),  Decimal("150000")),
        (uuid4(), PO_2_ID, "Cable Management Tray",           Decimal("30"), Decimal("3000"),  Decimal("90000")),
        # PO-3
        (uuid4(), PO_3_ID, "Server Rack Equipment",           Decimal("5"),  Decimal("150000"), Decimal("750000")),
        # PO-4
        (uuid4(), PO_4_ID, "Office Chairs (Ergonomic)",       Decimal("20"), Decimal("16000"),  Decimal("320000")),
    ]

    for pi in po_items:
        await conn.execute(
            """INSERT INTO po_line_items (id, po_id, item_name, quantity, unit_price, total)
               VALUES ($1,$2,$3,$4,$5,$6)""",
            *pi
        )
    print("   ✅ 8 PO line items created.")

    # ==================== INVOICES ====================
    print("🧾 Creating invoices...")
    invoices = [
        # INV-1: Paid invoice for PO-1
        (INV_1_ID, "INV-2026-0001", PO_1_ID,
         today - timedelta(days=20), today - timedelta(days=5),
         Decimal("4250000"), Decimal("382500"), Decimal("382500"), Decimal("0"), Decimal("5015000"),
         "paid", None, None, now - timedelta(days=4), now - timedelta(days=20)),
        # INV-2: Pending payment for PO-2
        (INV_2_ID, "INV-2026-0002", PO_2_ID,
         today - timedelta(days=3), today + timedelta(days=27),
         Decimal("1080000"), Decimal("97200"), Decimal("97200"), Decimal("0"), Decimal("1274400"),
         "pending_payment", None, None, None, now - timedelta(days=3)),
        # INV-3: Overdue invoice for PO-3
        (INV_3_ID, "INV-2026-0003", PO_3_ID,
         today - timedelta(days=50), today - timedelta(days=20),
         Decimal("750000"), Decimal("67500"), Decimal("67500"), Decimal("0"), Decimal("885000"),
         "pending_payment", None, None, None, now - timedelta(days=50)),
        # INV-4: Overdue invoice for PO-4
        (INV_4_ID, "INV-2026-0004", PO_4_ID,
         today - timedelta(days=80), today - timedelta(days=50),
         Decimal("320000"), Decimal("28800"), Decimal("28800"), Decimal("0"), Decimal("377600"),
         "pending_payment", None, None, None, now - timedelta(days=80)),
    ]

    for inv in invoices:
        await conn.execute(
            """INSERT INTO invoices (id, invoice_number, po_id, invoice_date, due_date, subtotal, cgst, sgst, igst, grand_total, status, pdf_url, emailed_at, paid_at, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::invoice_status,$12,$13,$14,$15)""",
            *inv
        )
    print("   ✅ 4 invoices created.")

    # ==================== ACTIVITY LOGS ====================
    print("📜 Creating activity logs...")
    logs = [
        (uuid4(), ADMIN_ID,        "Rajesh Kumar",  "user",           ADMIN_ID,        "registered",  "Admin user Rajesh Kumar registered.",                               now - timedelta(days=60)),
        (uuid4(), PROC_OFFICER_ID, "Priya Sharma",  "user",           PROC_OFFICER_ID, "registered",  "Procurement officer Priya Sharma registered.",                      now - timedelta(days=59)),
        (uuid4(), PROC_OFFICER_ID, "Priya Sharma",  "vendor",         VENDOR_1_ID,     "created",     "Vendor TechnoServ Solutions created.",                              now - timedelta(days=58)),
        (uuid4(), PROC_OFFICER_ID, "Priya Sharma",  "vendor",         VENDOR_2_ID,     "created",     "Vendor Global Furnish Pvt Ltd created.",                            now - timedelta(days=58)),
        (uuid4(), PROC_OFFICER_ID, "Priya Sharma",  "rfq",            RFQ_1_ID,        "created",     "RFQ RFQ-2026-0001 created for Dell Laptops & Monitors.",            now - timedelta(days=45)),
        (uuid4(), PROC_OFFICER_ID, "Priya Sharma",  "rfq",            RFQ_1_ID,        "published",   "RFQ RFQ-2026-0001 published and sent to TechnoServ Solutions.",      now - timedelta(days=44)),
        (uuid4(), VENDOR_USER_1,   "Amit Patel",    "quotation",      QT_1_ID,         "submitted",   "Quotation QT-2026-0001 submitted for RFQ-2026-0001.",               now - timedelta(days=40)),
        (uuid4(), MANAGER_ID,      "Vikram Singh",  "approval",       QT_1_ID,         "approved",    "L1 approval granted for QT-2026-0001.",                             now - timedelta(days=32)),
        (uuid4(), ADMIN_ID,        "Rajesh Kumar",  "approval",       QT_1_ID,         "approved",    "L2 approval granted for QT-2026-0001.",                             now - timedelta(days=28)),
        (uuid4(), PROC_OFFICER_ID, "Priya Sharma",  "purchase_order", PO_1_ID,         "generated",   "Purchase Order PO-2026-0001 generated for TechnoServ Solutions.",    now - timedelta(days=25)),
        (uuid4(), PROC_OFFICER_ID, "Priya Sharma",  "rfq",            RFQ_2_ID,        "created",     "RFQ RFQ-2026-0002 created for Office Furniture.",                   now - timedelta(days=30)),
        (uuid4(), PROC_OFFICER_ID, "Priya Sharma",  "rfq",            RFQ_3_ID,        "published",   "RFQ RFQ-2026-0003 published for Logistics Services.",               now - timedelta(days=14)),
        (uuid4(), PROC_OFFICER_ID, "Priya Sharma",  "invoice",        INV_1_ID,        "paid",        "Invoice INV-2026-0001 marked as paid (₹50,15,000).",                now - timedelta(days=4)),
        (uuid4(), PROC_OFFICER_ID, "Priya Sharma",  "rfq",            RFQ_4_ID,        "published",   "RFQ RFQ-2026-0004 published for Office Renovation.",                now - timedelta(days=7)),
        (uuid4(), ADMIN_ID,        "Rajesh Kumar",  "user",           ADMIN_ID,        "login",       "Admin Rajesh Kumar logged in.",                                     now - timedelta(hours=2)),
    ]

    for log in logs:
        await conn.execute(
            """INSERT INTO activity_logs (id, actor_id, actor_name, entity_type, entity_id, action, description, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)""",
            *log
        )
    print("   ✅ 15 activity logs created.")

    # ==================== NOTIFICATIONS ====================
    print("🔔 Creating notifications...")
    notifications = [
        # Admin notifications
        (uuid4(), ADMIN_ID, "approval",     "New approval request: QT-2026-0003 for Logistics Services requires L2 approval.",           "/approvals",          False, now - timedelta(days=6)),
        (uuid4(), ADMIN_ID, "invoice",      "Invoice INV-2026-0003 is overdue. Amount: ₹8,85,000.",                                      "/invoices",           False, now - timedelta(days=2)),
        (uuid4(), ADMIN_ID, "invoice",      "Invoice INV-2026-0004 is overdue. Amount: ₹3,77,600.",                                      "/invoices",           False, now - timedelta(days=2)),
        (uuid4(), ADMIN_ID, "system",       "Welcome to VendorBridge! Start by reviewing pending approvals.",                             "/dashboard",          True,  now - timedelta(days=60)),
        # Manager notifications
        (uuid4(), MANAGER_ID, "approval",   "New approval request: QT-2026-0003 for Warehouse Logistics requires your L1 review.",       "/approvals",          False, now - timedelta(days=6)),
        (uuid4(), MANAGER_ID, "rfq",        "RFQ RFQ-2026-0004 has been published. 2 vendors invited.",                                  "/rfqs",               True,  now - timedelta(days=7)),
        # Procurement officer notifications
        (uuid4(), PROC_OFFICER_ID, "quotation", "New quotation received from PenPaper Stationery Co for RFQ-2026-0005.",                 "/quotations",         False, now - timedelta(days=5)),
        (uuid4(), PROC_OFFICER_ID, "quotation", "New quotation received from Global Furnish Pvt Ltd for RFQ-2026-0005.",                 "/quotations",         False, now - timedelta(days=4)),
        (uuid4(), PROC_OFFICER_ID, "approval",  "Approval completed: QT-2026-0002 for Office Furniture has been fully approved.",        "/approvals",          True,  now - timedelta(days=8)),
        # Vendor notifications
        (uuid4(), VENDOR_USER_1, "rfq",     "You have been invited to submit a quotation for RFQ-2026-0003 (Logistics Services).",       "/rfqs",               False, now - timedelta(days=14)),
        (uuid4(), VENDOR_USER_1, "po",      "Purchase Order PO-2026-0001 has been issued to you. Total: ₹50,15,000.",                    "/purchase-orders",    True,  now - timedelta(days=25)),
        (uuid4(), VENDOR_USER_2, "rfq",     "You have been invited to submit a quotation for RFQ-2026-0005 (Stationery Q3).",            "/rfqs",               False, now - timedelta(days=9)),
    ]

    for n in notifications:
        await conn.execute(
            """INSERT INTO notifications (id, user_id, type, message, link, is_read, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7)""",
            *n
        )
    print("   ✅ 12 notifications created.")

    # ==================== DOC COUNTERS ====================
    print("🔢 Setting doc counters...")
    year = today.year
    await conn.execute(
        "INSERT INTO doc_counters (doc_type, year, last_seq) VALUES ($1, $2, $3)",
        "rfq", year, 6
    )
    await conn.execute(
        "INSERT INTO doc_counters (doc_type, year, last_seq) VALUES ($1, $2, $3)",
        "quotation", year, 6
    )
    await conn.execute(
        "INSERT INTO doc_counters (doc_type, year, last_seq) VALUES ($1, $2, $3)",
        "po", year, 4
    )
    await conn.execute(
        "INSERT INTO doc_counters (doc_type, year, last_seq) VALUES ($1, $2, $3)",
        "invoice", year, 4
    )
    print("   ✅ Doc counters set.")

    await conn.close()

    # ==================== SUMMARY ====================
    print("\n" + "=" * 60)
    print("🎉 SEED DATA LOADED SUCCESSFULLY!")
    print("=" * 60)
    print()
    print("📋 LOGIN CREDENTIALS:")
    print("─" * 40)
    print(f"  👑 Admin:")
    print(f"     Email:    admin@vendorbridge.com")
    print(f"     Password: admin123")
    print()
    print(f"  📦 Procurement Officer:")
    print(f"     Email:    procurement@vendorbridge.com")
    print(f"     Password: officer123")
    print()
    print(f"  👔 Manager:")
    print(f"     Email:    manager@vendorbridge.com")
    print(f"     Password: manager123")
    print()
    print(f"  🏢 Vendor (TechnoServ):")
    print(f"     Email:    contact@technoserv.in")
    print(f"     Password: vendor123")
    print()
    print(f"  🏢 Vendor (Global Furnish):")
    print(f"     Email:    sales@globalfurnish.com")
    print(f"     Password: vendor123")
    print()
    print(f"  🏢 Vendor (Swift Logistics):")
    print(f"     Email:    info@swiftlogistics.in")
    print(f"     Password: vendor123")
    print()
    print("📊 DATA SUMMARY:")
    print("─" * 40)
    print("  • 6 Users  (1 admin, 1 procurement, 1 manager, 3 vendors)")
    print("  • 5 Vendors (4 active, 1 pending)")
    print("  • 6 RFQs   (draft → po_generated, various statuses)")
    print("  • 6 Quotations with 19 line items")
    print("  • 6 Approvals (4 completed, 2 pending)")
    print("  • 4 Purchase Orders with 8 line items")
    print("  • 4 Invoices (1 paid, 1 pending, 2 overdue)")
    print("  • 15 Activity Logs")
    print("  • 12 Notifications")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
