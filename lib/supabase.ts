import { createClient } from '@supabase/supabase-js';

let _supabase: any = null;

export function getSupabase(): any {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}
