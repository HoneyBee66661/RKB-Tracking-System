export const dynamic = 'force-dynamic';

// GET /api/qr/[code] — Resolve QR scan → GR document with handover state
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    // Resolve QR code
    const { data: qr } = await getSupabase()
      .from('qr_codes')
      .select('*, gr_documents(*, handover_records(*))')
      .eq('code_value', code)
      .single();

    if (!qr) {
      return NextResponse.json({ success: false, error: 'QR code not found' }, { status: 404 });
    }

    // Get lines with PO details
    const { data: lines } = await getSupabase()
      .from('gr_document_lines')
      .select('*, po_lines(po_no, line_no, material_desc, qty_ordered, supplier)')
      .eq('gr_document_id', qr.gr_document_id);

    return NextResponse.json({
      success: true,
      data: { ...qr, lines: lines || [] },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
