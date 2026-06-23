export const dynamic = 'force-dynamic';

// GET /api/tracking?order_id=ORD-001 — Public tracking lookup (no auth)
// Returns DHL-style status timeline

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get('order_id');
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'order_id parameter required' }, { status: 400 });
    }

    // Get PO lines for this order
    const { data: poLines } = await getSupabase()
      .from('po_lines')
      .select('*')
      .eq('user_order_no', orderId);

    // Get GR documents with handover
    const { data: grDocs } = await getSupabase()
      .from('gr_documents')
      .select('*, handover_records(*)')
      .eq('user_order_no', orderId)
      .order('created_at', { ascending: false });

    // Build timeline
    const timeline: { status: string; date: string; detail: string }[] = [];

    if (poLines && poLines.length > 0) {
      const earliestPo = poLines.reduce((a: any, b: any) => a.created_at < b.created_at ? a : b);
      timeline.push({
        status: 'ordered',
        date: earliestPo.created_at,
        detail: `${poLines.length} item(s) ordered`,
      });
    }

    if (grDocs && grDocs.length > 0) {
      const earliestGr = grDocs.reduce((a, b) => a.created_at < b.created_at ? a : b);
      timeline.push({
        status: 'ready_for_pickup',
        date: earliestGr.created_at,
        detail: `GR document(s) received — ready for pickup`,
      });

      const delivered = grDocs.find(d => d.status === 'delivered');
      if (delivered && delivered.handover_records?.[0]) {
        const h = delivered.handover_records[0];
        timeline.push({
          status: 'delivered',
          date: h.delivered_at,
          detail: `Delivered to ${h.delivered_to || 'requestor'} by ${h.delivered_by_name || 'clerk'}`,
        });
      }
    }

    // Summary
    const totalOrdered = poLines?.reduce((s, l) => s + (l.qty_ordered || 0), 0) || 0;
    const totalReceived = grDocs?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        status: grDocs?.some(d => d.status === 'delivered')
          ? 'delivered'
          : grDocs && grDocs.length > 0
            ? 'ready_for_pickup'
            : 'ordered',
        items_count: poLines?.length || 0,
        total_ordered: totalOrdered,
        total_received: totalOrdered, // simplified: all ordered qty received when GR exists
        timeline,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
