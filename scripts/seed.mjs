// Seed script — run with: node --env-file=.env.local scripts/seed.mjs
// Populates all tables with realistic test data for development

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase env vars — check .env.local');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function seed() {
  console.log('Seeding database...\n');

  // ── 1. Clerks (PINs stored as plaintext for MVP) ──
  const clerks = [
    { name: 'Bambang', pin_hash: '1234' },
    { name: 'Siti', pin_hash: '5678' },
    { name: 'Rudi', pin_hash: '9012' },
    { name: 'Dewi', pin_hash: '2468' },
  ];

  await db.from('clerks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { data: clerkRows } = await db.from('clerks').insert(clerks).select();
  console.log(`  ✓ ${clerkRows?.length || 0} clerks`);

  // ── 2. Users ──
  const users = [
    { name: 'Mr. Stark', role: 'admin', contact: 'telegram:7514593114' },
    { name: 'Production Line A', role: 'requestor', contact: null },
    { name: 'Maintenance Dept', role: 'requestor', contact: null },
    { name: 'Warehouse Sparepart #3', role: 'requestor', contact: null },
    { name: 'Project Site - Kalimantan', role: 'requestor', contact: 'ext: 4521' },
  ];

  await db.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { data: userRows } = await db.from('users').insert(users).select();
  console.log(`  ✓ ${userRows?.length || 0} users`);

  // ── 3. PO Lines (from ME2N) ──
  // Mix of orders at different lifecycle stages
  const poLines = [
    // ORD-001: Fully delivered (2 items)
    { po_no: 'PO-2025-001', line_no: 1, user_order_no: 'ORD-001', material_desc: 'Hydraulic Hose DN20 x 10m', qty_ordered: 4, supplier: 'PT Indosupply' },
    { po_no: 'PO-2025-001', line_no: 2, user_order_no: 'ORD-001', material_desc: 'Brass Fitting 3/4"', qty_ordered: 20, supplier: 'PT Indosupply' },
    // ORD-002: Ready at warehouse (not yet delivered)
    { po_no: 'PO-2025-002', line_no: 1, user_order_no: 'ORD-002', material_desc: 'Ball Valve SS316 2"', qty_ordered: 6, supplier: 'CV Makmur Jaya' },
    // ORD-003: Still ordered (no GR yet)
    { po_no: 'PO-2025-003', line_no: 1, user_order_no: 'ORD-003', material_desc: 'V-Belt A-48', qty_ordered: 50, supplier: 'PT Beltindo' },
    { po_no: 'PO-2025-003', line_no: 2, user_order_no: 'ORD-003', material_desc: 'Timing Belt HTD 400-8M', qty_ordered: 10, supplier: 'PT Beltindo' },
    // ORD-004: Still ordered
    { po_no: 'PO-2025-004', line_no: 1, user_order_no: 'ORD-004', material_desc: 'Roller Bearing 6205-2RS', qty_ordered: 30, supplier: 'PT Bearing Jaya' },
    // ORD-005: Partially received (mixed status)
    { po_no: 'PO-2025-005', line_no: 1, user_order_no: 'ORD-005', material_desc: 'Safety Helmet Blue', qty_ordered: 100, supplier: 'PT SafetyFirst' },
    { po_no: 'PO-2025-005', line_no: 2, user_order_no: 'ORD-005', material_desc: 'Safety Goggle Clear', qty_ordered: 50, supplier: 'PT SafetyFirst' },
    { po_no: 'PO-2025-005', line_no: 3, user_order_no: 'ORD-005', material_desc: 'Welding Mask Auto-Dark', qty_ordered: 5, supplier: 'PT SafetyFirst' },
    // ORD-006: Ready at warehouse
    { po_no: 'PO-2025-006', line_no: 1, user_order_no: 'ORD-006', material_desc: 'Electric Motor 5.5kW 3-Phase', qty_ordered: 2, supplier: 'PT Motorindo' },
    { po_no: 'PO-2025-006', line_no: 2, user_order_no: 'ORD-006', material_desc: 'VFD Drive 7.5kW', qty_ordered: 2, supplier: 'PT Motorindo' },
    // ORD-007: Delivered
    { po_no: 'PO-2025-007', line_no: 1, user_order_no: 'ORD-007', material_desc: 'Steel Pipe SCH40 4" x 6m', qty_ordered: 15, supplier: 'CV Baja Perkasa' },
    // ORD-008: Ordered only
    { po_no: 'PO-2025-008', line_no: 1, user_order_no: 'ORD-008', material_desc: 'Pneumatic Cylinder DNC-80-200', qty_ordered: 8, supplier: 'PT Pneumatik' },
  ];

  // Clear and re-insert to avoid conflicts
  await db.from('po_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { data: poRows, error: poErr } = await db.from('po_lines').insert(poLines).select();
  if (poErr) { console.error('  ✗ PO lines:', poErr.message); process.exit(1); }
  console.log(`  ✓ ${poRows?.length || 0} PO lines`);

  // ── 4. GR Documents (from MB51) ──
  // ORD-001: 2 GR docs (both delivered)
  // ORD-002: 1 GR doc (ready)
  // ORD-005: 1 GR doc (ready — partial receipt, only safety helmet received)
  // ORD-006: 1 GR doc (ready)
  // ORD-007: 1 GR doc (delivered)

  const grDocs = [
    { gr_doc_no: 'GR-2025-001', user_order_no: 'ORD-001', gr_date: '2025-06-20', status: 'delivered' },
    { gr_doc_no: 'GR-2025-002', user_order_no: 'ORD-002', gr_date: '2025-06-21', status: 'ready' },
    { gr_doc_no: 'GR-2025-003', user_order_no: 'ORD-005', gr_date: '2025-06-22', status: 'ready' },
    { gr_doc_no: 'GR-2025-004', user_order_no: 'ORD-006', gr_date: '2025-06-23', status: 'ready' },
    { gr_doc_no: 'GR-2025-005', user_order_no: 'ORD-007', gr_date: '2025-06-24', status: 'delivered' },
    { gr_doc_no: 'GR-2025-006', user_order_no: 'ORD-001', gr_date: '2025-06-25', status: 'delivered' },
  ];

  await db.from('gr_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('qr_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('handover_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('gr_document_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { data: grRows, error: grErr } = await db.from('gr_documents').insert(grDocs).select();
  if (grErr) { console.error('  ✗ GR docs:', grErr.message); process.exit(1); }
  console.log(`  ✓ ${grRows?.length || 0} GR documents`);

  // ── 5. GR Document Lines ──
  const grDocMap = {};
  for (const gr of grRows) grDocMap[gr.gr_doc_no] = gr.id;

  const poMap = {};
  for (const po of poRows) poMap[`${po.po_no}:${po.line_no}`] = po.id;

  const grLines = [
    // GR-2025-001 → PO-2025-001 lines 1 & 2 (full receipt)
    { gr_document_id: grDocMap['GR-2025-001'], po_line_id: poMap['PO-2025-001:1'], qty_received: 4 },
    { gr_document_id: grDocMap['GR-2025-001'], po_line_id: poMap['PO-2025-001:2'], qty_received: 20 },
    // GR-2025-002 → PO-2025-002 line 1 (full receipt)
    { gr_document_id: grDocMap['GR-2025-002'], po_line_id: poMap['PO-2025-002:1'], qty_received: 6 },
    // GR-2025-003 → PO-2025-005 line 1 only (partial — only helmets arrived)
    { gr_document_id: grDocMap['GR-2025-003'], po_line_id: poMap['PO-2025-005:1'], qty_received: 80 },
    // GR-2025-004 → PO-2025-006 lines 1 & 2
    { gr_document_id: grDocMap['GR-2025-004'], po_line_id: poMap['PO-2025-006:1'], qty_received: 2 },
    { gr_document_id: grDocMap['GR-2025-004'], po_line_id: poMap['PO-2025-006:2'], qty_received: 1 },
    // GR-2025-005 → PO-2025-007 line 1
    { gr_document_id: grDocMap['GR-2025-005'], po_line_id: poMap['PO-2025-007:1'], qty_received: 15 },
    // GR-2025-006 → PO-2025-001 line 1 (another GR for same order)
    { gr_document_id: grDocMap['GR-2025-006'], po_line_id: poMap['PO-2025-001:1'], qty_received: 2 },
  ];

  const { data: grlRows, error: grlErr } = await db.from('gr_document_lines').insert(grLines).select();
  if (grlErr) { console.error('  ✗ GR lines:', grlErr.message); process.exit(1); }
  console.log(`  ✓ ${grlRows?.length || 0} GR document lines`);

  // ── 6. QR Codes (one per GR doc) ──
  const qrCodes = grRows.map(gr => ({
    gr_document_id: gr.id,
    code_value: gr.gr_doc_no.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toLowerCase() + '-' + randomBytes(3).toString('hex'),
  }));

  const { data: qrRows, error: qrErr } = await db.from('qr_codes').insert(qrCodes).select();
  if (qrErr) { console.error('  ✗ QR codes:', qrErr.message); process.exit(1); }
  console.log(`  ✓ ${qrRows?.length || 0} QR codes`);

  // Update gr_documents.qr_code_id
  for (const qr of qrRows) {
    await db.from('gr_documents').update({ qr_code_id: qr.id }).eq('id', qr.gr_document_id);
  }
  console.log(`  ✓ Linked QR codes to GR documents`);

  // ── 7. Handover Records ──
  // GR-2025-001: delivered by Bambang to "Produksi Line A"
  // GR-2025-005: delivered by Siti to "Site Kalimantan"
  // GR-2025-006: delivered by Rudi to "Produksi Line A"

  const handovers = [
    {
      gr_document_id: grDocMap['GR-2025-001'],
      delivered_to: 'Produksi Line A',
      delivered_by_clerk_id: clerkRows?.find(c => c.name === 'Bambang')?.id || null,
      delivered_by_name: 'Bambang',
      delivered_at: '2025-06-21T08:30:00Z',
      photo_evidence_url: null,
    },
    {
      gr_document_id: grDocMap['GR-2025-005'],
      delivered_to: 'Site Kalimantan',
      delivered_by_clerk_id: clerkRows?.find(c => c.name === 'Siti')?.id || null,
      delivered_by_name: 'Siti',
      delivered_at: '2025-06-25T10:15:00Z',
      photo_evidence_url: null,
    },
    {
      gr_document_id: grDocMap['GR-2025-006'],
      delivered_to: 'Produksi Line A',
      delivered_by_clerk_id: clerkRows?.find(c => c.name === 'Rudi')?.id || null,
      delivered_by_name: 'Rudi',
      delivered_at: '2025-06-26T07:45:00Z',
      photo_evidence_url: null,
    },
  ];

  const { data: handoverRows, error: hErr } = await db.from('handover_records').insert(handovers).select();
  if (hErr) { console.error('  ✗ Handovers:', hErr.message); process.exit(1); }
  console.log(`  ✓ ${handoverRows?.length || 0} handover records`);

  // ── 8. Import Logs ──
  const importLogs = [
    { import_type: 'me2n', file_name: 'ME2N_20250620.xlsx', rows_imported: 10, errors: null },
    { import_type: 'mb51', file_name: 'MB51_20250620.xlsx', rows_imported: 6, errors: null },
  ];

  const { data: logRows, error: lErr } = await db.from('import_logs').insert(importLogs).select();
  if (lErr) { console.error('  ✗ Import logs:', lErr.message); process.exit(1); }
  console.log(`  ✓ ${logRows?.length || 0} import logs`);

  // ── Summary ──
  console.log('\n── Seed Complete ──');
  console.log('');
  console.log('  ORD-001 → Delivered (2 GR docs, both delivered)');
  console.log('  ORD-002 → Ready at Warehouse');
  console.log('  ORD-003 → Ordered (no GR yet)');
  console.log('  ORD-004 → Ordered (no GR yet)');
  console.log('  ORD-005 → Ready (partial GR — 80/100 helmets)');
  console.log('  ORD-006 → Ready at Warehouse');
  console.log('  ORD-007 → Delivered');
  console.log('  ORD-008 → Ordered (no GR yet)');
  console.log('');
  console.log('  Clerk PINs: Bambang=1234, Siti=5678, Rudi=9012, Dewi=2468');
}

seed().catch(console.error);
