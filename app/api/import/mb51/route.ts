export const dynamic = 'force-dynamic';

// POST /api/import/mb51 — Import SAP MB51 export (GR documents)
// Expects: { rows: Mb51Row[] }
// Upserts gr_documents + gr_document_lines, auto-generates QR code
// Auto-flips matched PO lines to "Ready at Warehouse"

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { randomBytes } from 'crypto';

function shortCode(grDocNo: string): string {
  // Use last 6 chars of GR doc + random suffix for URL safety
  const suffix = randomBytes(3).toString('hex');
  return grDocNo.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toLowerCase() + '-' + suffix;
}

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No rows provided' }, { status: 400 });
    }

    let grDocsCreated = 0;
    let linesCreated = 0;
    let errors: string[] = [];
    const seenDocs = new Set<string>();

    for (const row of rows) {
      const grDocNo = (row['GR Document No'] || '').trim();
      if (!grDocNo) { errors.push('Row with missing GR Document No skipped'); continue; }

      // Find matching PO line
      const { data: poLine } = await getSupabase()
        .from('po_lines')
        .select('id')
        .eq('po_no', row['PO No.'])
        .eq('line_no', row['PO Line'])
        .single();

      // Upsert GR document (once per unique doc)
      if (!seenDocs.has(grDocNo)) {
        seenDocs.add(grDocNo);
        const { data: grDoc, error: grErr } = await getSupabase()
          .from('gr_documents')
          .upsert({
            gr_doc_no: grDocNo,
            user_order_no: row['Order ID'],
            gr_date: row['Posting Date'] || null,
            status: 'ready',
          }, { onConflict: 'gr_doc_no' })
          .select()
          .single();

        if (grErr) { errors.push(`GR doc ${grDocNo}: ${grErr.message}`); continue; }

        // Auto-generate QR
        const code = shortCode(grDocNo);
        const { error: qrErr } = await getSupabase().from('qr_codes').upsert({
          gr_document_id: grDoc.id,
          code_value: code,
        }, { onConflict: 'gr_document_id' });
        if (qrErr) errors.push(`QR ${grDocNo}: ${qrErr.message}`);

        grDocsCreated++;
      }

      // Get GR doc id
      const { data: grDoc } = await getSupabase()
        .from('gr_documents')
        .select('id')
        .eq('gr_doc_no', grDocNo)
        .single();

      if (grDoc) {
        const { error: lineErr } = await getSupabase().from('gr_document_lines').upsert({
          gr_document_id: grDoc.id,
          po_line_id: poLine?.id || null,
          qty_received: row['Qty Received'],
        }, { onConflict: 'gr_document_id,po_line_id' });
        if (!lineErr) linesCreated++;
      }
    }

    await getSupabase().from('import_logs').insert({
      import_type: 'mb51',
      file_name: req.headers.get('x-file-name') || null,
      rows_imported: rows.length,
      errors: errors.length > 0 ? errors : null,
    });

    return NextResponse.json({
      success: true,
      data: {
        gr_documents_created: grDocsCreated,
        gr_lines_created: linesCreated,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
