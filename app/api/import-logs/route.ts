export const dynamic = 'force-dynamic';

// GET /api/import-logs?type=mb51 — list import logs by type

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type');
    if (!type || !['mb51', 'me2n'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid type (use mb51 or me2n)' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .from('import_logs')
      .select('id, file_name, rows_imported, errors, created_at')
      .eq('import_type', type)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
