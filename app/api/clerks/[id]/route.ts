export const dynamic = 'force-dynamic';

// PATCH /api/clerks/[id] — Update clerk (deactivate, reset PIN)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();
    const { error } = await (getSupabase().from('clerks') as any).update(updates).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
