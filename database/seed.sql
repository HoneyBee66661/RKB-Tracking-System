-- Seed data for development/testing

-- Warehousemen (PINs are bcrypt hashes of 4-digit codes)
-- PIN 1234 -> $2a$10$... (generate with: node -e "console.log(require('bcryptjs').hashSync('1234',10))")
-- For dev, we'll use plaintext check in the API since this is an MVP
insert into warehousemen (name, pin_hash, active) values
  ('Bambang', '1234', true),
  ('Siti', '5678', true),
  ('Rudi', '9012', true),
  ('Fahmi', '1234', true);

-- Users
insert into users (name, role, contact) values
  ('Mr. Stark', 'admin', 'telegram:7514593114'),
  ('Production Line A', 'requestor', null),
  ('Maintenance Dept', 'requestor', null);

-- Sample PO lines (ME2N)
insert into po_lines (po_no, line_no, user_order_no, material_desc, qty_ordered, supplier) values
  ('PO-2025-001', 1, 'ORD-001', 'Hydraulic Hose DN20 x 10m', 4, 'PT Indosupply'),
  ('PO-2025-001', 2, 'ORD-001', 'Brass Fitting 3/4"', 20, 'PT Indosupply'),
  ('PO-2025-002', 1, 'ORD-002', 'Ball Valve SS316 2"', 6, 'CV Makmur Jaya'),
  ('PO-2025-003', 1, 'ORD-003', 'V-Belt A-48', 50, 'PT Beltindo'),
  ('PO-2025-004', 1, 'ORD-004', 'Roller Bearing 6205-2RS', 30, 'PT Bearing Jaya');

-- Sample GR documents (MB51)
insert into gr_documents (gr_doc_no, user_order_no, gr_date, status) values
  ('GR-2025-001', 'ORD-001', '2025-06-20', 'ready'),
  ('GR-2025-002', 'ORD-002', '2025-06-21', 'ready');

-- Sample GR document lines
insert into gr_document_lines (gr_document_id, po_line_id, qty_received)
select g.id, p.id, p.qty_ordered
from gr_documents g, po_lines p
where g.gr_doc_no = 'GR-2025-001' and p.po_no = 'PO-2025-001' and p.line_no = 1;

insert into gr_document_lines (gr_document_id, po_line_id, qty_received)
select g.id, p.id, p.qty_ordered
from gr_documents g, po_lines p
where g.gr_doc_no = 'GR-2025-001' and p.po_no = 'PO-2025-001' and p.line_no = 2;

insert into gr_document_lines (gr_document_id, po_line_id, qty_received)
select g.id, p.id, p.qty_ordered
from gr_documents g, po_lines p
where g.gr_doc_no = 'GR-2025-002' and p.po_no = 'PO-2025-002' and p.line_no = 1;

-- Sample QR codes
insert into qr_codes (gr_document_id, code_value)
select id, 'GR-' || substring(gr_doc_no from 4) from gr_documents;
