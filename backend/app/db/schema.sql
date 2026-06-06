create extension if not exists pgcrypto;

-- ===== ENUMS =====
create type user_role        as enum ('admin','procurement_officer','manager','vendor');
create type vendor_status    as enum ('active','pending','blocked');
create type rfq_status       as enum ('draft','published','quotations_received','under_review','approved','po_generated','closed','cancelled');
create type rfq_vendor_status as enum ('invited','quoted','declined');
create type quotation_status as enum ('draft','submitted','selected','rejected');
create type approval_status  as enum ('pending','approved','rejected');
create type invoice_status   as enum ('pending_payment','paid','overdue');

-- ===== USERS =====
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  first_name text not null,
  last_name text,
  phone text,
  country text,
  role user_role not null default 'procurement_officer',
  vendor_id uuid,                       -- set when role = 'vendor'
  additional_info text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== VENDORS =====
create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,               -- IT Hardware | Furniture | Logistics | Construction | Stationery ...
  gst_number text,
  contact_name text,
  contact_phone text,
  contact_email text,
  address text,
  status vendor_status not null default 'pending',
  rating numeric(2,1) default 0,        -- 0.0 - 5.0
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table users add constraint fk_users_vendor
  foreign key (vendor_id) references vendors(id);

-- ===== RFQs =====
create table rfqs (
  id uuid primary key default gen_random_uuid(),
  rfq_number text unique not null,      -- RFQ-2025-0001
  title text not null,
  category text,
  description text,
  deadline date,
  status rfq_status not null default 'draft',
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rfq_line_items (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references rfqs(id) on delete cascade,
  item_name text not null,
  quantity numeric not null default 1,
  unit text
);

create table rfq_vendors (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references rfqs(id) on delete cascade,
  vendor_id uuid not null references vendors(id),
  status rfq_vendor_status not null default 'invited',
  invited_at timestamptz not null default now(),
  unique (rfq_id, vendor_id)
);

create table rfq_attachments (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references rfqs(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  uploaded_at timestamptz not null default now()
);

-- ===== QUOTATIONS =====
create table quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text unique not null, -- QT-2025-0001
  rfq_id uuid not null references rfqs(id) on delete cascade,
  vendor_id uuid not null references vendors(id),
  status quotation_status not null default 'draft',
  subtotal numeric not null default 0,
  tax_percent numeric not null default 18,
  tax_amount numeric not null default 0,
  grand_total numeric not null default 0,
  delivery_days int,
  payment_terms text,
  notes text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rfq_id, vendor_id)
);

create table quotation_line_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  item_name text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  delivery_days int
);

-- ===== APPROVALS (ordered chain per selected quotation) =====
create table approvals (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references rfqs(id) on delete cascade,
  quotation_id uuid not null references quotations(id) on delete cascade,
  level int not null,                    -- 1 = L1 review, 2 = L2 approval
  approver_id uuid references users(id),
  approver_name text,
  status approval_status not null default 'pending',
  remarks text,
  acted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ===== PURCHASE ORDERS =====
create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text unique not null,        -- PO-2025-0001
  rfq_id uuid not null references rfqs(id),
  quotation_id uuid not null references quotations(id),
  vendor_id uuid not null references vendors(id),
  buyer_org_name text,
  buyer_address text,
  buyer_gstin text,
  po_date date not null default current_date,
  subtotal numeric not null default 0,
  cgst numeric not null default 0,
  sgst numeric not null default 0,
  igst numeric not null default 0,
  grand_total numeric not null default 0,
  status text not null default 'generated',
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table po_line_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references purchase_orders(id) on delete cascade,
  item_name text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0
);

-- ===== INVOICES =====
create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,   -- INV-2025-0001
  po_id uuid not null references purchase_orders(id),
  invoice_date date not null default current_date,
  due_date date,
  subtotal numeric not null default 0,
  cgst numeric not null default 0,
  sgst numeric not null default 0,
  igst numeric not null default 0,
  grand_total numeric not null default 0,
  status invoice_status not null default 'pending_payment',
  pdf_url text,
  emailed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ===== ACTIVITY LOGS (IMMUTABLE / write-once) =====
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  actor_name text,
  entity_type text not null,             -- rfq | quotation | approval | purchase_order | invoice | vendor
  entity_id uuid,
  action text not null,                  -- created | published | submitted | selected | approved | rejected | generated | emailed | paid ...
  description text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create or replace function prevent_log_mutation() returns trigger as $$
begin
  raise exception 'activity_logs are immutable (write-once; no update or delete)';
end;
$$ language plpgsql;

create trigger trg_logs_no_update before update on activity_logs
  for each row execute function prevent_log_mutation();
create trigger trg_logs_no_delete before delete on activity_logs
  for each row execute function prevent_log_mutation();

-- ===== NOTIFICATIONS =====
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  type text,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ===== ORG SETTINGS (buyer details on PO/Invoice) =====
create table organization_settings (
  id uuid primary key default gen_random_uuid(),
  org_name text not null default 'Your Organization',
  address text,
  gstin text,
  logo_url text,
  default_tax_percent numeric not null default 18,
  updated_at timestamptz not null default now()
);

-- ===== DOC NUMBERING (race-safe) =====
create table doc_counters (
  doc_type text not null,
  year int not null,
  last_seq int not null default 0,
  primary key (doc_type, year)
);

create or replace function next_doc_number(p_prefix text, p_doc_type text)
returns text as $$
declare
  v_year int := extract(year from now());
  v_seq  int;
begin
  insert into doc_counters(doc_type, year, last_seq)
  values (p_doc_type, v_year, 1)
  on conflict (doc_type, year)
    do update set last_seq = doc_counters.last_seq + 1
  returning last_seq into v_seq;
  return p_prefix || '-' || v_year || '-' || lpad(v_seq::text, 4, '0');
end;
$$ language plpgsql;
