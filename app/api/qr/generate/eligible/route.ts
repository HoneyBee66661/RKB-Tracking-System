export const dynamic = 'force-dynamic';

// GET /api/qr/generate/eligible — GR documents without QR codes
import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Find GR docs with status 'ready' that have no QR code yet
    const { data: qrDocIds } = await getSupabase()
      .from('qr_codes')
      .select('gr_document_id');

    const existingIds = new Set((qrDocIds || []).map(q => q.gr_document_id));

    const { data, error } = await getSupabase()
      .from('gr_documents')
      .select('id, gr_doc_no, user_order_no, status, gr_date')
      .eq('status', 'ready')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const eligible = (data || []).filter(d => !existingIds.has(d.id));
    return NextResponse.json({ success: true, data: eligible });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
