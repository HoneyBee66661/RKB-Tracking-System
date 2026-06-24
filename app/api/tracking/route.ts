export const dynamic = 'force-dynamic';

// GET /api/tracking — Public tracking lookup (no auth)
//   ?order_id=ORD-001  — lookup by order ID
//   ?q=hydraulic       — search by material name or order ID
//   ?department=Production+Line+A — filter by recipient

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get('order_id');
    const query = req.nextUrl.searchParams.get('q');
    const department = req.nextUrl.searchParams.get('department');

    if (!orderId && !query) {
      return NextResponse.json({ success: false, error: 'Provide order_id or search query' }, { status: 400 });
    }

    let orderIds: string[] = [];

    if (orderId) {
      orderIds = [orderId];
    } else if (query) {
      // Search by material name or order ID
      const { data: poMatches } = await getSupabase()
        .from('po_lines')
        .select('user_order_no')
        .or(`user_order_no.ilike.%${query}%,material_desc.ilike.%${query}%`)
        .limit(20);

      if (poMatches?.length) {
        orderIds = [...new Set(poMatches.map(p => p.user_order_no))];
      }

      if (orderIds.length === 0) {
        return NextResponse.json({ success: true, data: { orders: [] } });
      }
    }

    // Fetch all matching orders
    const orders = await Promise.all(
      orderIds.map(async (oid) => {
        // PO lines
        const { data: poLines } = await getSupabase()
          .from('po_lines')
          .select('*')
          .eq('user_order_no', oid);

        // GR docs with handover
        const { data: grDocs } = await getSupabase()
          .from('gr_documents')
          .select('*, handover_records(*)')
          .eq('user_order_no', oid)
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
              detail: `Delivered to ${h.delivered_to || 'requestor'} by ${h.delivered_by_name || 'warehouseman'}`,
            });
          }
        }

        const totalOrdered = poLines?.reduce((s, l) => s + (l.qty_ordered || 0), 0) || 0;

        return {
          order_id: oid,
          status: grDocs?.some(d => d.status === 'delivered')
            ? 'delivered'
            : grDocs && grDocs.length > 0
              ? 'ready_for_pickup'
              : 'ordered',
          items_count: poLines?.length || 0,
          total_ordered: totalOrdered,
          timeline,
          materials: poLines?.map(p => p.material_desc).filter(Boolean).join(', ') || '',
          supplier: poLines?.[0]?.supplier || '',
        };
      })
    );

    return NextResponse.json({ success: true, data: { orders } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
