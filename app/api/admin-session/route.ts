export const dynamic = 'force-dynamic';

// POST /api/admin-session — Simple admin login
// MVP: checks against users table with role='admin'
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'username and password required' }, { status: 400 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (password !== adminPassword) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    // Look up admin user in the users table
    const { data: user } = await getSupabase()
      .from('users')
      .select('*')
      .eq('name', username)
      .eq('role', 'admin')
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Admin user not found' }, { status: 401 });
    }

    const token = Buffer.from(`admin:${user.id}:${Date.now()}`).toString('base64');

    return NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, role: user.role },
        token,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
