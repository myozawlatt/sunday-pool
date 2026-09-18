import { cache } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { isSupabaseConfigured } from './env';
import { createServerSupabase } from './supabase/server';

/**
 * The signed-in admin's Supabase client, or null.
 * cache() dedupes this within a request: the panel layout and the page each call
 * requireAdmin(), which would otherwise mean two `getClaims()` round trips per view.
 */
export const getAdmin = cache(async () => {
  await connection(); // always per-request — never prerender admin pages
  if (!isSupabaseConfigured) return null;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  return { supabase, claims: data.claims };
});

/**
 * Use in every /manage page and server action. proxy.ts already guards the routes,
 * but server actions must verify the session themselves.
 */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect('/manage/gate');
  return admin;
}
