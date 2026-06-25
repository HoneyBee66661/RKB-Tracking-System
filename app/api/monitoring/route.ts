export const dynamic = 'force-dynamic';

// GET /api/monitoring — line-level delivery monitoring data
// Returns flat rows (one per GR line item) for the full table view.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(_req: NextRequest) {
  try {
    // Fetch every GR document line with PO and handover info
    // This gives us one row per material line, including undelivered items.
    const { data: lines, error } = await getSupabase()
      .from('gr_document_lines')
      .select(`
        id,
        qty_received,
        po_lines!inner(
          po_no,
          line_no,
          material_desc,
          qty_ordered
        ),
        gr_documents!inner(
          gr_doc_no,
          user_order_no,
          gr_date,
          status,
          handover_records(
            id,
            delivered_to,
            delivered_by_name,
            delivered_at,
            photo_evidence_url
          )
        )
      `)
      .order('gr_date', { referencedTable: 'gr_documents', ascending: false });

    if (error) throw error;

    // Flatten nested Supabase response into flat rows
    const flat = (lines || []).map((line: any) => {
      const po = (line.po_lines as any[])?.[0] || {};
      const gr = (line.gr_documents as any[])?.[0] || {};
      const handover = (gr.handover_records as any[])?.[0] || {};

      return {
        id: line.id,
        gr_date: gr.gr_date || null,
        po_no: po.po_no || null,
        line_no: po.line_no ?? null,
        description: po.material_desc || null,
        qty: line.qty_received,
        gr_doc_no: gr.gr_doc_no || null,
        user_order_no: gr.user_order_no || null,
        warehouseman: handover.delivered_by_name || null,
        issue_date: handover.delivered_at || null,
        received_by: handover.delivered_to || null,
        status: gr.status || 'ready',
        photo_evidence_url: handover.photo_evidence_url || null,
      };
    });

    return NextResponse.json({ success: true, data: flat });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
