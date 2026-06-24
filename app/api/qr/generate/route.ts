export const dynamic = 'force-dynamic';

// POST /api/qr/generate — Create QR code for a GR document
// Body: { gr_document_id }
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { gr_document_id } = await req.json();
    if (!gr_document_id) {
      return NextResponse.json({ success: false, error: 'gr_document_id required' }, { status: 400 });
    }

    // Check GR doc exists
    const { data: grDoc } = await getSupabase()
      .from('gr_documents')
      .select('id, gr_doc_no')
      .eq('id', gr_document_id)
      .single();

    if (!grDoc) {
      return NextResponse.json({ success: false, error: 'GR document not found' }, { status: 404 });
    }

    // Check if QR already exists
    const { data: existing } = await getSupabase()
      .from('qr_codes')
      .select('id')
      .eq('gr_document_id', gr_document_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, error: 'QR code already exists for this GR document' }, { status: 409 });
    }

    // Generate unique code value
    const shortId = grDoc.gr_doc_no.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toLowerCase();
    const codeValue = `${shortId}-${randomBytes(3).toString('hex')}`;

    const { data, error } = await getSupabase()
      .from('qr_codes')
      .insert({ gr_document_id, code_value: codeValue })
      .select('*, gr_documents(gr_doc_no, user_order_no)')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
