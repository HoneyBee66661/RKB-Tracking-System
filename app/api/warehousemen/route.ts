export const dynamic = 'force-dynamic';

// CRUD for warehouseman roster (admin only)
// GET  /api/warehousemen — list all warehousemen
// POST /api/warehousemen — create new warehouseman (name, pin)
// PATCH /api/warehousemen/[id] — update (deactivate, reset PIN)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('warehousemen')
      .select('id, name, active, created_at')
      .order('name');

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, pin } = await req.json();
    if (!name || !pin) {
      return NextResponse.json({ success: false, error: 'name and pin required' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .from('warehousemen')
      .insert({ name, pin_hash: pin, active: true })
      .select('id, name, active, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
