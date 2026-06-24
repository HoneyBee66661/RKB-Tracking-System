export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { warehouseman_id, pin } = await req.json();
    if (!warehouseman_id || !pin) {
      return NextResponse.json({ success: false, error: 'warehouseman_id and pin required' }, { status: 400 });
    }

    const { data: warehouseman } = await getSupabase()
      .from('warehousemen')
      .select('*')
      .eq('id', warehouseman_id)
      .eq('active', true)
      .single();

    if (!warehouseman) {
      return NextResponse.json({ success: false, error: 'Warehouseman not found' }, { status: 401 });
    }

    if (warehouseman.pin_hash !== pin) {
      return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
    }

    const token = Buffer.from(`warehouseman:${warehouseman_id}:${Date.now()}`).toString('base64');
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      success: true,
      data: {
        warehouseman: { id: warehouseman.id, name: warehouseman.name },
        token,
        expires_at: expiresAt,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
