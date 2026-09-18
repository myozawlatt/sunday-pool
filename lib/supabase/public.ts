import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '../env';

let client: SupabaseClient | undefined;

/** Cookie-less anon client for public pages — RLS only exposes published match days. */
export function getPublicClient() {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
