export const dynamic = 'force-dynamic';

// GET /api/dashboard/outstanding — Outstanding orders summary for admin
import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get all PO lines grouped by order
    const { data: poLines } = await getSupabase()
      .from('po_lines')
      .select('*')
      .order('created_at', { ascending: false });

    // Get all GR docs
    const { data: grDocs } = await getSupabase()
      .from('gr_documents')
      .select('*, handover_records(*)');

    // Group by order
    const orderMap = new Map<string, any>();

    for (const po of poLines || []) {
      if (!orderMap.has(po.user_order_no)) {
        orderMap.set(po.user_order_no, {
          user_order_no: po.user_order_no,
          po_lines: [],
          gr_docs: [],
          timeline: [],
        });
      }
      orderMap.get(po.user_order_no).po_lines.push(po);
    }

    for (const gr of grDocs || []) {
      if (orderMap.has(gr.user_order_no)) {
        orderMap.get(gr.user_order_no).gr_docs.push(gr);
      }
    }

    const orders = Array.from(orderMap.values()).map(o => {
      const hasDelivered = o.gr_docs.some((g: any) => g.status === 'delivered');
      const hasReady = o.gr_docs.some((g: any) => g.status === 'ready');
      const status = o.gr_docs.length === 0
        ? 'ordered'
        : hasDelivered
          ? 'delivered'
          : 'ready';

      const qtyOrdered = o.po_lines.reduce((s: number, l: any) => s + (l.qty_ordered || 0), 0);
      const qtyReceived = o.gr_docs.length > 0 ? qtyOrdered : 0; // simplified: all ordered when GR exists

      return { ...o, status, qty_ordered: qtyOrdered, qty_received: qtyReceived };
    });

    return NextResponse.json({
      success: true,
      data: {
        orders,
        summary: {
          total_orders: orders.length,
          ordered: orders.filter(o => o.status === 'ordered').length,
          ready: orders.filter(o => o.status === 'ready').length,
          delivered: orders.filter(o => o.status === 'delivered').length,
        },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
