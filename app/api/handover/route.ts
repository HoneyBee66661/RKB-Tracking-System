export const dynamic = 'force-dynamic';

// POST /api/handover — Record a handover (clerk scans QR + captures photo)
// Expects: { gr_document_id, delivered_to, delivered_by_clerk_id, photo_data_url? }

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { gr_document_id, delivered_to, delivered_by_clerk_id, photo_data_url } = await req.json();

    if (!gr_document_id || !delivered_by_clerk_id) {
      return NextResponse.json(
        { success: false, error: 'gr_document_id and delivered_by_clerk_id are required' },
        { status: 400 }
      );
    }

    // Verify clerk exists
    const { data: clerk } = getSupabase()
      .from('clerks')
      .select('name')
      .eq('id', delivered_by_clerk_id)
      .eq('active', true)
      .single();

    if (!clerk) {
      return NextResponse.json({ success: false, error: 'Clerk not found or inactive' }, { status: 404 });
    }

    // Upload photo if provided
    let photoUrl: string | null = null;
    if (photo_data_url) {
      const base64 = photo_data_url.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const fileName = `handover/${gr_document_id}_${Date.now()}.jpg`;

      const { data: upload } = getSupabase().storage
        .from('handover-photos')
        .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });

      if (upload) {
        const { data: pubUrl } = getSupabase().storage.from('handover-photos').getPublicUrl(fileName);
        photoUrl = pubUrl?.publicUrl || null;
      }
    }

    // Check if already delivered
    const { data: existing } = getSupabase()
      .from('handover_records')
      .select('id')
      .eq('gr_document_id', gr_document_id)
      .single();

    if (existing) {
      return NextResponse.json({ success: false, error: 'Already delivered' }, { status: 409 });
    }

    // Create handover record
    const { data: handover, error: hErr } = getSupabase()
      .from('handover_records')
      .insert({
        gr_document_id,
        delivered_to,
        delivered_by_clerk_id,
        delivered_by_name: clerk.name,
        photo_evidence_url: photoUrl,
      })
      .select()
      .single();

    if (hErr) throw hErr;

    // Flip status to delivered
    const { error: uErr } = getSupabase()
      .from('gr_documents')
      .update({ status: 'delivered' })
      .eq('id', gr_document_id);

    if (uErr) throw uErr;

    return NextResponse.json({ success: true, data: handover });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
