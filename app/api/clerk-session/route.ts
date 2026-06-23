export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { clerk_id, pin } = await req.json();
    if (!clerk_id || !pin) {
      return NextResponse.json({ success: false, error: 'clerk_id and pin required' }, { status: 400 });
    }

    const { data: clerk } = await getSupabase()
      .from('clerks')
      .select('*')
      .eq('id', clerk_id)
      .eq('active', true)
      .single();

    if (!clerk) {
      return NextResponse.json({ success: false, error: 'Clerk not found' }, { status: 401 });
    }

    if (clerk.pin_hash !== pin) {
      return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
    }

    const token = Buffer.from(`clerk:${clerk_id}:${Date.now()}`).toString('base64');
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      success: true,
      data: {
        clerk: { id: clerk.id, name: clerk.name },
        token,
        expires_at: expiresAt,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
