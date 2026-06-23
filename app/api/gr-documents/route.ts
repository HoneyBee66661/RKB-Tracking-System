export const dynamic = 'force-dynamic';

// GET /api/gr-documents — List GR documents with optional filters
//   ?status=ready|delivered&order_id=ORD-001&limit=50&offset=0
// GET /api/gr-documents/[id] — Single GR doc with full detail

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const orderId = url.searchParams.get('order_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = getSupabase()
      .from('gr_documents')
      .select('*, qr_codes(*), handover_records(*)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (orderId) query = query.eq('user_order_no', orderId);
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // Fetch lines & PO details for each GR doc
    const enriched = await Promise.all(
      (data || []).map(async (doc: any) => {
        const { data: lines } = await getSupabase()
          .from('gr_document_lines')
          .select('*, po_lines(po_no, line_no, material_desc, qty_ordered, supplier)')
          .eq('gr_document_id', doc.id);

        return { ...doc, lines: lines || [] };
      })
    );

    return NextResponse.json({
      success: true,
      data: { items: enriched, total: count || 0, limit, offset },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
