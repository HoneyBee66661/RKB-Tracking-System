-- Warehouse Material Tracking System — Database Schema
-- Supabase (Postgres)

-- 1. CLERKS (shared device identity)
create table if not exists clerks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  pin_hash    text not null, -- bcrypt hash of 4-digit PIN
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table clerks is 'Warehouse clerk roster for shared-scanner PIN login';

-- 2. USERS (admins & requestors)
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text not null check (role in ('admin','requestor')),
  contact     text,
  created_at  timestamptz not null default now()
);
comment on table users is 'System users — admins and material requestors';

-- 3. PO LINES (from ME2N export)
create table if not exists po_lines (
  id              uuid primary key default gen_random_uuid(),
  po_no           text not null,
  line_no         integer not null,
  user_order_no   text not null, -- SAP key / Order ID
  material_desc   text,
  qty_ordered     numeric(16,3),
  supplier        text,
  created_at      timestamptz not null default now(),
  unique(po_no, line_no)
);
create index idx_po_lines_order on po_lines(user_order_no);
comment on table po_lines is 'PO line items imported from SAP ME2N export';

-- 4. GR DOCUMENTS (from MB51 export)
create table if not exists gr_documents (
  id              uuid primary key default gen_random_uuid(),
  gr_doc_no       text not null unique, -- SAP GR document number
  user_order_no   text not null,
  gr_date         date,
  status          text not null default 'ready' check (status in ('ready','delivered')),
  qr_code_id      uuid,
  created_at      timestamptz not null default now()
);
create index idx_gr_doc_order on gr_documents(user_order_no);
create index idx_gr_doc_status on gr_documents(status);
comment on table gr_documents is 'Goods receipt documents imported from SAP MB51';

-- 5. GR DOCUMENT LINES (join: one GR doc → many material lines)
create table if not exists gr_document_lines (
  id              uuid primary key default gen_random_uuid(),
  gr_document_id  uuid not null references gr_documents(id) on delete cascade,
  po_line_id      uuid references po_lines(id),
  qty_received    numeric(16,3),
  unique(gr_document_id, po_line_id)
);
create index idx_grdl_gr_doc on gr_document_lines(gr_document_id);
comment on table gr_document_lines is 'Line-item detail within a GR document';

-- 6. QR CODES
create table if not exists qr_codes (
  id              uuid primary key default gen_random_uuid(),
  gr_document_id  uuid not null unique references gr_documents(id) on delete cascade,
  code_value      text not null unique, -- the short lookup key
  generated_at    timestamptz not null default now(),
  print_count     integer not null default 0
);
comment on table qr_codes is 'QR code records, one per GR document';

-- 7. HANDOVER RECORDS
create table if not exists handover_records (
  id                  uuid primary key default gen_random_uuid(),
  gr_document_id      uuid not null references gr_documents(id) on delete cascade,
  delivered_to        text,
  delivered_by_clerk_id uuid references clerks(id),
  delivered_by_name   text, -- snapshot of clerk name at time of handover
  delivered_at        timestamptz not null default now(),
  photo_evidence_url  text
);
create index idx_handover_gr on handover_records(gr_document_id);
comment on table handover_records is 'Handover audit trail — clerk, timestamp, photo';

-- 8. IMPORT LOGS
create table if not exists import_logs (
  id            uuid primary key default gen_random_uuid(),
  import_type   text not null check (import_type in ('me2n','mb51')),
  file_name     text,
  rows_imported integer not null default 0,
  errors        jsonb,
  created_at    timestamptz not null default now()
);
comment on table import_logs is 'Audit trail for ME2N/MB51 file imports';
