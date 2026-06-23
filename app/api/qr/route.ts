export const dynamic = 'force-dynamic';

// GET /api/qr — List QR codes
// POST /api/qr/generate — Manual QR generation for a GR doc
// GET /api/qr/[code] — Resolve QR code → GR document detail (for scanner)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await getSupabase()
      .from('qr_codes')
      .select('*, gr_documents(gr_doc_no, user_order_no, status)')
      .order('generated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
