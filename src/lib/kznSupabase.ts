import { createClient } from '@supabase/supabase-js';

const kznSupabaseUrl = ((import.meta as any).env?.VITE_KZN_SUPABASE_URL || '').trim();
const kznSupabaseAnonKey = ((import.meta as any).env?.VITE_KZN_SUPABASE_ANON_KEY || '').trim();

export const kznSupabase =
  kznSupabaseUrl && kznSupabaseAnonKey
    ? createClient(kznSupabaseUrl, kznSupabaseAnonKey)
    : null;
