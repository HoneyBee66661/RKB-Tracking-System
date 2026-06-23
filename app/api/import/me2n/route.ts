export const dynamic = 'force-dynamic';

// POST /api/import/me2n — Import SAP ME2N export (PO lines)
// Expects: { rows: Me2nRow[] }
// Upserts po_lines table, logs results

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No rows provided' }, { status: 400 });
    }

    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const { error } = getSupabase().from('po_lines').upsert(
        {
          po_no: row['PO No.'],
          line_no: row['Line'],
          user_order_no: row['Order ID'],
          material_desc: row['Material Description']?.trim(),
          qty_ordered: row['Qty Ordered'],
          supplier: row['Supplier']?.trim(),
        },
        { onConflict: 'po_no,line_no', ignoreDuplicates: false }
      );
      if (error) {
        errors.push(`Row ${imported + 1}: ${error.message}`);
      } else {
        imported++;
      }
    }

    getSupabase().from('import_logs').insert({
      import_type: 'me2n',
      file_name: req.headers.get('x-file-name') || null,
      rows_imported: imported,
      errors: errors.length > 0 ? errors : null,
    });

    return NextResponse.json({
      success: true,
      data: { rows_imported: imported, errors: errors.length > 0 ? errors : undefined },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
