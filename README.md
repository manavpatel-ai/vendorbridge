# VendorBridge — Procurement & Vendor Management ERP

VendorBridge is a full-stack, enterprise-grade Procurement & Vendor Management ERP. It streamlines the entire procurement lifecycle—from vendor registration and Request for Quotation (RFQ) publication to side-by-side bid comparisons, multi-level manager approvals, Purchase Order generation, and print-ready PDF invoice dispatch.

---

## 🚀 Tech Stack

- **Backend**: FastAPI, SQLAlchemy 2.0 (Async + `asyncpg`), Pydantic v2, Custom JWT Authentication (Bcrypt + python-jose).
- **Database**: PostgreSQL (Custom cluster running on port `5433` with trigger-backed write-once activity logs).
- **Frontend**: React + Vite, Tailwind CSS, TanStack Query, Axios, Lucide Icons, Recharts.
- **Reporting & PDF**: `xhtml2pdf` (HTML-to-PDF rendering) and local SMTP falls.

---

## 📁 Project Directory Structure

```
vendorbridge/
├── backend/            # FastAPI Backend Application
│   ├── app/
│   │   ├── api/        # Routers (Auth, RFQs, Quotes, Invoices, etc.)
│   │   ├── core/       # Security (JWT), configurations, dependencies
│   │   ├── db/         # SQLAlchemy connection & DB schema
│   │   ├── models/     # Declarative models
│   │   ├── schemas/    # Pydantic validation schemas
│   │   └── services/   # PDF generation, email, numbering, activity logs
│   ├── seed.py         # Mock database seeder
│   └── requirements.txt
├── frontend/           # React SPA Client
│   ├── src/
│   │   ├── components/ # Core Layout, Sidebar, Topbar
│   │   ├── lib/        # API client, AuthContext
│   │   └── pages/      # 11 distinct ERP application screens
│   └── package.json
└── db_data/            # Local Database Cluster data (Git ignored)
```

---

## ⚙️ Running Locally

### 1. Database Server
The project uses a custom PostgreSQL database cluster running on port `5433` with trust authentication:
```bash
# Started via local postgres executable
postgres.exe -D "path\to\vendorbridge\db_data" -p 5433
```

### 2. Backend FastAPI Server
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   ```bash
   # Windows PowerShell
   .venv\Scripts\Activate.ps1
   ```
3. Run the database seeder to populate the database with initial stats, users, and transactions:
   ```bash
   python seed.py
   ```
4. Start the Uvicorn web server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   - *API Documentation is available at*: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Frontend Vite Server
1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Start the Vite development server:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```
   - *Access the application at*: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)

---

## 🔑 Demo Credentials

To check out different roles and workflows, log in with the following seeded accounts. The password for all accounts is **`password123`**.

| Role | Email | Description / Actions |
|---|---|---|
| **Procurement Officer** | `officer@vendorbridge.com` | Creates RFQs, registers vendors, selects quotes, issues POs, emails invoices. |
| **L1 Manager** | `priya@vendorbridge.com` | Approves Level 1 selected quotations. |
| **L2 Manager** | `rahul@vendorbridge.com` | Clear Level 2 selected quotations (final PO generation step). |
| **Vendor User** | `vendor1@acme.com` | Reviews published RFQs, drafts and submits unit-price bids, views Invoices. |
| **System Admin** | `admin@vendorbridge.com` | Global read access, system configurations, immutable audit trail views. |
