import asyncio
import asyncpg
import os
import sys

# Define database connection URLs
# Default postgres DB for initial setup
POSTGRES_DB_URL = "postgresql://postgres@127.0.0.1:5433/postgres"
# Target DB
VENDORBRIDGE_DB_URL = "postgresql://postgres@127.0.0.1:5433/vendorbridge"

SCHEMA_FILE = os.path.join(os.path.dirname(__file__), "schema.sql")

async def init_database():
    print("Connecting to default postgres database...")
    try:
        conn = await asyncpg.connect(POSTGRES_DB_URL)
    except Exception as e:
        print(f"Error connecting to PostgreSQL server: {e}")
        sys.exit(1)
        
    print("Checking if database 'vendorbridge' exists...")
    row = await conn.fetchrow(
        "SELECT 1 FROM pg_database WHERE datname = 'vendorbridge'"
    )
    
    if not row:
        print("Database 'vendorbridge' not found. Creating database...")
        await conn.execute("CREATE DATABASE vendorbridge")
        print("Database 'vendorbridge' created successfully!")
    else:
        print("Database 'vendorbridge' already exists.")
        
    await conn.close()
    
    print("Connecting to 'vendorbridge' database...")
    conn = await asyncpg.connect(VENDORBRIDGE_DB_URL)
    
    print(f"Reading schema from {SCHEMA_FILE}...")
    if not os.path.exists(SCHEMA_FILE):
        print(f"Schema file not found at {SCHEMA_FILE}!")
        await conn.close()
        sys.exit(1)
        
    with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
        schema_sql = f.read()
        
    print("Applying schema DDL script...")
    try:
        # asyncpg's execute can run multi-statement scripts
        await conn.execute(schema_sql)
        print("Schema applied successfully!")
    except Exception as e:
        # Check if the tables already exist (in case rerun)
        if "already exists" in str(e) or "already defined" in str(e):
            print("Schema seems to be already applied. (Skip schema application)")
        else:
            print(f"Error applying schema: {e}")
            await conn.close()
            sys.exit(1)
            
    # Insert default organization setting if not present
    org_settings = await conn.fetchrow("SELECT 1 FROM organization_settings LIMIT 1")
    if not org_settings:
        print("Inserting default organization settings...")
        await conn.execute(
            """
            INSERT INTO organization_settings (org_name, address, gstin, default_tax_percent)
            VALUES ('VendorBridge Corp', '123 Procurement Way, Bangalore, KA, India', '29AAAAA1111A1Z1', 18)
            """
        )
        print("Default organization settings inserted.")
        
    await conn.close()
    print("Database initialization completed successfully!")

if __name__ == "__main__":
    asyncio.run(init_database())
