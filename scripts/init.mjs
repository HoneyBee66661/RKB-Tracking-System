// Database init + seed — run with: node --env-file=.env.local scripts/init.mjs
// 1. Applies schema.sql (creates tables if not exist)
// 2. Seeds all tables with test data

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase env vars — check .env.local');
  process.exit(1);
}

const projectRef = url.replace('https://', '').replace('.supabase.co', '');
const db = createClient(url, key, { auth: { persistSession: false } });

async function runSchema() {
  console.log('Applying schema...');

  // Try direct DB connection if DATABASE_URL is provided
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const { default: pg } = await import('pg');
      const pool = new pg.Pool({ connectionString: dbUrl });
      const sql = readFileSync(resolve(__dirname, '../database/schema.sql'), 'utf8');
      await pool.query(sql);
      await pool.end();
      console.log('  ✓ Schema applied via direct DB connection');
      return;
    } catch (e) {
      console.log(`  ⚠ Direct DB failed (${e.message}), trying fallback...`);
    }
  }

  // Fallback: Use Supabase's pg_dump SQL endpoint (requires management API)
  // If you see this message, either set DATABASE_URL or run schema.sql manually:
  // 1. Go to https://supabase.com/dashboard/project/${projectRef}/sql/new
  // 2. Paste database/schema.sql
  // 3. Click "Run"
  console.log(`  ╔══════════════════════════════════════════════════════════╗`);
  console.log(`  ║  Run this SQL in your Supabase dashboard SQL editor:    ║`);
  console.log(`  ║  ${`https://supabase.com/dashboard/project/${projectRef}/sql/new`}`);
  console.log(`  ║                                                         ║`);
  console.log(`  ║  Or set DATABASE_URL in .env.local for auto-setup:      ║`);
  console.log(`  ║  postgresql://postgres:YOUR_DB_PW@db.${projectRef}.supabase.co:5432/postgres`);
  console.log(`  ╚══════════════════════════════════════════════════════════╝`);
}

async function seed() {
  console.log('\nSeeding database...\n');

  // ── 1. Warehousemen ──
  await db.from('warehousemen').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { data: warehouseRows } = await db.from('warehousemen')
    .insert([
      { name: 'Bambang', pin_hash: '1234' },
      { name: 'Siti', pin_hash: '5678' },
      { name: 'Rudi', pin_hash: '9012' },
      { name: 'Dewi', pin_hash: '2468' },
    ])
    .select();
  console.log(`  ✓ ${warehouseRows?.length || 0} warehousemen`);

  // ── 2. Users ──
  await db.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { data: userRows } = await db.from('users')
    .insert([
      { name: 'Mr. Stark', role: 'admin', contact: 'telegram:7514593114' },
      { name: 'Production Line A', role: 'requestor', contact: null },
      { name: 'Maintenance Dept', role: 'requestor', contact: null },
      { name: 'Warehouse Sparepart #3', role: 'requestor', contact: null },
      { name: 'Project Site - Kalimantan', role: 'requestor', contact: 'ext: 4521' },
    ])
    .select();
  console.log(`  ✓ ${userRows?.length || 0} users`);

  // ── 3. PO Lines ──
  await db.from('po_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const poLines = [
    { po_no: 'PO-2025-001', line_no: 1, user_order_no: 'ORD-001', material_desc: 'Hydraulic Hose DN20 x 10m', qty_ordered: 4, supplier: 'PT Indosupply' },
    { po_no: 'PO-2025-001', line_no: 2, user_order_no: 'ORD-001', material_desc: 'Brass Fitting 3/4"', qty_ordered: 20, supplier: 'PT Indosupply' },
    { po_no: 'PO-2025-002', line_no: 1, user_order_no: 'ORD-002', material_desc: 'Ball Valve SS316 2"', qty_ordered: 6, supplier: 'CV Makmur Jaya' },
    { po_no: 'PO-2025-003', line_no: 1, user_order_no: 'ORD-003', material_desc: 'V-Belt A-48', qty_ordered: 50, supplier: 'PT Beltindo' },
    { po_no: 'PO-2025-003', line_no: 2, user_order_no: 'ORD-003', material_desc: 'Timing Belt HTD 400-8M', qty_ordered: 10, supplier: 'PT Beltindo' },
    { po_no: 'PO-2025-004', line_no: 1, user_order_no: 'ORD-004', material_desc: 'Roller Bearing 6205-2RS', qty_ordered: 30, supplier: 'PT Bearing Jaya' },
    { po_no: 'PO-2025-005', line_no: 1, user_order_no: 'ORD-005', material_desc: 'Safety Helmet Blue', qty_ordered: 100, supplier: 'PT SafetyFirst' },
    { po_no: 'PO-2025-005', line_no: 2, user_order_no: 'ORD-005', material_desc: 'Safety Goggle Clear', qty_ordered: 50, supplier: 'PT SafetyFirst' },
    { po_no: 'PO-2025-005', line_no: 3, user_order_no: 'ORD-005', material_desc: 'Welding Mask Auto-Dark', qty_ordered: 5, supplier: 'PT SafetyFirst' },
    { po_no: 'PO-2025-006', line_no: 1, user_order_no: 'ORD-006', material_desc: 'Electric Motor 5.5kW 3-Phase', qty_ordered: 2, supplier: 'PT Motorindo' },
    { po_no: 'PO-2025-006', line_no: 2, user_order_no: 'ORD-006', material_desc: 'VFD Drive 7.5kW', qty_ordered: 2, supplier: 'PT Motorindo' },
    { po_no: 'PO-2025-007', line_no: 1, user_order_no: 'ORD-007', material_desc: 'Steel Pipe SCH40 4" x 6m', qty_ordered: 15, supplier: 'CV Baja Perkasa' },
    { po_no: 'PO-2025-008', line_no: 1, user_order_no: 'ORD-008', material_desc: 'Pneumatic Cylinder DNC-80-200', qty_ordered: 8, supplier: 'PT Pneumatik' },
  ];
  const { data: poRows, error: poErr } = await db.from('po_lines').insert(poLines).select();
  if (poErr) { console.error(`  ✗ PO lines: ${poErr.message}`); process.exit(1); }
  console.log(`  ✓ ${poRows?.length || 0} PO lines`);

  // ── 4. GR Documents ──
  await db.from('gr_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('qr_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('handover_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('gr_document_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const grDocs = [
    { gr_doc_no: 'GR-2025-001', user_order_no: 'ORD-001', gr_date: '2025-06-20', status: 'delivered' },
    { gr_doc_no: 'GR-2025-002', user_order_no: 'ORD-002', gr_date: '2025-06-21', status: 'ready' },
    { gr_doc_no: 'GR-2025-003', user_order_no: 'ORD-005', gr_date: '2025-06-22', status: 'ready' },
    { gr_doc_no: 'GR-2025-004', user_order_no: 'ORD-006', gr_date: '2025-06-23', status: 'ready' },
    { gr_doc_no: 'GR-2025-005', user_order_no: 'ORD-007', gr_date: '2025-06-24', status: 'delivered' },
    { gr_doc_no: 'GR-2025-006', user_order_no: 'ORD-001', gr_date: '2025-06-25', status: 'delivered' },
  ];
  const { data: grRows, error: grErr } = await db.from('gr_documents').insert(grDocs).select();
  if (grErr) { console.error(`  ✗ GR docs: ${grErr.message}`); process.exit(1); }
  console.log(`  ✓ ${grRows?.length || 0} GR documents`);

  // ── 5. GR Document Lines ──
  const grDocMap = {};
  for (const gr of grRows) grDocMap[gr.gr_doc_no] = gr.id;
  const poMap = {};
  for (const po of poRows) poMap[`${po.po_no}:${po.line_no}`] = po.id;

  const grLines = [
    { gr_document_id: grDocMap['GR-2025-001'], po_line_id: poMap['PO-2025-001:1'], qty_received: 4 },
    { gr_document_id: grDocMap['GR-2025-001'], po_line_id: poMap['PO-2025-001:2'], qty_received: 20 },
    { gr_document_id: grDocMap['GR-2025-002'], po_line_id: poMap['PO-2025-002:1'], qty_received: 6 },
    { gr_document_id: grDocMap['GR-2025-003'], po_line_id: poMap['PO-2025-005:1'], qty_received: 80 },
    { gr_document_id: grDocMap['GR-2025-004'], po_line_id: poMap['PO-2025-006:1'], qty_received: 2 },
    { gr_document_id: grDocMap['GR-2025-004'], po_line_id: poMap['PO-2025-006:2'], qty_received: 1 },
    { gr_document_id: grDocMap['GR-2025-005'], po_line_id: poMap['PO-2025-007:1'], qty_received: 15 },
    { gr_document_id: grDocMap['GR-2025-006'], po_line_id: poMap['PO-2025-001:1'], qty_received: 2 },
  ];
  const { data: grlRows, error: grlErr } = await db.from('gr_document_lines').insert(grLines).select();
  if (grlErr) { console.error(`  ✗ GR lines: ${grlErr.message}`); process.exit(1); }
  console.log(`  ✓ ${grlRows?.length || 0} GR document lines`);

  // ── 6. QR Codes ──
  const qrCodes = grRows.map(gr => ({
    gr_document_id: gr.id,
    code_value: gr.gr_doc_no.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toLowerCase() + '-' + randomBytes(3).toString('hex'),
  }));
  const { data: qrRows, error: qrErr } = await db.from('qr_codes').insert(qrCodes).select();
  if (qrErr) { console.error(`  ✗ QR codes: ${qrErr.message}`); process.exit(1); }
  console.log(`  ✓ ${qrRows?.length || 0} QR codes`);

  console.log('  ✓ QR codes linked via FK');

  // ── 7. Handover Records ──
  const handovers = [
    { gr_document_id: grDocMap['GR-2025-001'], delivered_to: 'Produksi Line A', delivered_by_warehouseman_id: warehouseRows?.find(c => c.name === 'Bambang')?.id || null, delivered_by_name: 'Bambang', delivered_at: '2025-06-21T08:30:00Z', photo_evidence_url: null },
    { gr_document_id: grDocMap['GR-2025-005'], delivered_to: 'Site Kalimantan', delivered_by_warehouseman_id: warehouseRows?.find(c => c.name === 'Siti')?.id || null, delivered_by_name: 'Siti', delivered_at: '2025-06-25T10:15:00Z', photo_evidence_url: null },
    { gr_document_id: grDocMap['GR-2025-006'], delivered_to: 'Produksi Line A', delivered_by_warehouseman_id: warehouseRows?.find(c => c.name === 'Rudi')?.id || null, delivered_by_name: 'Rudi', delivered_at: '2025-06-26T07:45:00Z', photo_evidence_url: null },
  ];
  const { data: handoverRows, error: hErr } = await db.from('handover_records').insert(handovers).select();
  if (hErr) { console.error(`  ✗ Handovers: ${hErr.message}`); process.exit(1); }
  console.log(`  ✓ ${handoverRows?.length || 0} handover records`);

  // ── 8. Import Logs ──
  const { data: logRows, error: lErr } = await db.from('import_logs').insert([
    { import_type: 'me2n', file_name: 'ME2N_20250620.xlsx', rows_imported: 13, errors: null },
    { import_type: 'mb51', file_name: 'MB51_20250620.xlsx', rows_imported: 6, errors: null },
  ]).select();
  if (lErr) { console.error(`  ✗ Import logs: ${lErr.message}`); process.exit(1); }
  console.log(`  ✓ ${logRows?.length || 0} import logs`);

  // ── Summary ──
  console.log('\n── Seed Complete ──────────────────────');
  console.log('  ORD-001 → Delivered (2 GR docs)');
  console.log('  ORD-002 → Ready at Warehouse');
  console.log('  ORD-003 → Ordered (no GR yet)');
  console.log('  ORD-004 → Ordered (no GR yet)');
  console.log('  ORD-005 → Ready (partial: 80/100 helmets)');
  console.log('  ORD-006 → Ready at Warehouse');
  console.log('  ORD-007 → Delivered');
  console.log('  ORD-008 → Ordered (no GR yet)');
  console.log('  Warehouseman PINs: Bambang=1234, Siti=5678, Rudi=9012, Dewi=2468');
}

async function main() {
  await runSchema();
  await seed();
}

main().catch(console.error);
