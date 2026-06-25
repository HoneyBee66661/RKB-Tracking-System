export const dynamic = 'force-dynamic';

// GET /api/data/:table — list all rows from a data table (for editing)
// PUT /api/data/:table — bulk update rows (upsert by id)
// Allowed tables: gr_documents, po_lines

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

const ALLOWED_TABLES = ['gr_documents', 'po_lines'] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    if (!ALLOWED_TABLES.includes(table as any)) {
      return NextResponse.json({ success: false, error: 'Invalid table' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params;
    if (!ALLOWED_TABLES.includes(table as any)) {
      return NextResponse.json({ success: false, error: 'Invalid table' }, { status: 400 });
    }

    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No rows provided' }, { status: 400 });
    }

    let updated = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (!row.id) { errors.push('Row missing id'); continue; }
      const { error } = await getSupabase()
        .from(table)
        .update(row)
        .eq('id', row.id);

      if (error) errors.push(`Row ${row.id}: ${error.message}`);
      else updated++;
    }

    return NextResponse.json({
      success: true,
      data: { updated, errors: errors.length > 0 ? errors : undefined },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
