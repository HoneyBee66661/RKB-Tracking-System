export const dynamic = 'force-dynamic';

// GET /api/qr/generate/eligible — GR documents without QR codes
import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('gr_documents')
      .select(`
        id,
        gr_doc_no,
        user_order_no,
        status,
        gr_date
      `)
      .is('qr_code_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
