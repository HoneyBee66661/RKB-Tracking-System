export const dynamic = 'force-dynamic';

// POST /api/qr/print — Increment print_count for a QR code
// Body: { qr_code_id }
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { qr_code_id } = await req.json();
    if (!qr_code_id) {
      return NextResponse.json({ success: false, error: 'qr_code_id required' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .rpc('increment_qr_print_count', { qr_id: qr_code_id })
      .select()
      .single();

    // Fallback if RPC doesn't exist — direct update
    if (error) {
      const { data: qr } = await getSupabase()
        .from('qr_codes')
        .select('print_count')
        .eq('id', qr_code_id)
        .single();

      const newCount = (qr?.print_count || 0) + 1;

      const { error: updateErr } = await getSupabase()
        .from('qr_codes')
        .update({ print_count: newCount })
        .eq('id', qr_code_id);

      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, data: { print_count: newCount } });
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
