import { isSupabaseConfigured } from '@/lib/env';
import { getPublicClient } from '@/lib/supabase/public';

/**
 * Daily Vercel Cron (vercel.json) — a tiny query so the free Supabase project isn't paused for inactivity.
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!isSupabaseConfigured) {
    return Response.json({ ok: false, reason: 'Supabase is not configured' }, { status: 503 });
  }

  const { error } = await getPublicClient().from('players').select('id', { count: 'exact', head: true });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true, at: new Date().toISOString() });
}
