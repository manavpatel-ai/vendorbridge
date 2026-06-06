import asyncio
import asyncpg
import os
import sys

# Add the backend/ directory to the Python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.core.config import settings

SCHEMA_FILE = os.path.join(os.path.dirname(__file__), "app", "db", "schema.sql")

async def reset():
    db_url = settings.DATABASE_URL
    print(f"Loaded DATABASE_URL: {db_url}")
    
    # Adapt to asyncpg (replace postgresql+asyncpg:// or postgres:// with postgresql://)
    asyncpg_url = db_url
    if asyncpg_url.startswith("postgresql+asyncpg://"):
        asyncpg_url = asyncpg_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    elif asyncpg_url.startswith("postgres://"):
        asyncpg_url = asyncpg_url.replace("postgres://", "postgresql://", 1)
        
    print(f"Connecting to database with asyncpg...")
    try:
        conn = await asyncpg.connect(asyncpg_url)
        print("Connected successfully!")
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return
        
    print("Dropping existing tables and custom types if they exist...")
    try:
        # Cascade drop all tables
        await conn.execute(
            """
            DROP TABLE IF EXISTS 
                activity_logs, 
                notifications, 
                organization_settings, 
                doc_counters, 
                invoices, 
                po_line_items, 
                purchase_orders, 
                approvals, 
                quotation_line_items, 
                quotations, 
                rfq_attachments, 
                rfq_vendors, 
                rfq_line_items, 
                rfqs, 
                users, 
                vendors 
            CASCADE;
            """
        )
        # Cascade drop all types
        await conn.execute(
            """
            DROP TYPE IF EXISTS 
                user_role, 
                vendor_status, 
                rfq_status, 
                rfq_vendor_status, 
                quotation_status, 
                approval_status, 
                invoice_status 
            CASCADE;
            """
        )
        print("Existing schema dropped successfully.")
    except Exception as e:
        print(f"Warning/Error dropping old schema: {e}")
        
    print(f"Reading DDL schema from {SCHEMA_FILE}...")
    if not os.path.exists(SCHEMA_FILE):
        print(f"Schema file not found at {SCHEMA_FILE}!")
        await conn.close()
        return
        
    with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
        schema_sql = f.read()
        
    print("Applying DDL schema...")
    try:
        await conn.execute(schema_sql)
        print("DDL schema successfully applied!")
    except Exception as e:
        print(f"Error applying DDL schema: {e}")
        await conn.close()
        return
        
    # Insert default organization setting
    print("Inserting default organization settings...")
    try:
        await conn.execute(
            """
            INSERT INTO organization_settings (org_name, address, gstin, default_tax_percent)
            VALUES ('VendorBridge Corp', '123 Procurement Way, Bangalore, KA, India', '29AAAAA1111A1Z1', 18)
            """
        )
        print("Default organization settings inserted.")
    except Exception as e:
        print(f"Error inserting default settings: {e}")
        
    await conn.close()
    print("Database reset and schema initialization completed successfully!")

if __name__ == "__main__":
    asyncio.run(reset())
