export const dynamic = 'force-dynamic';

// PATCH /api/warehousemen/[id] — Update warehouseman (deactivate, reset PIN)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();
    const { data, error } = await getSupabase()
      .from('warehousemen')
      .update(updates)
      .eq('id', id)
      .select('id, name, active, created_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
