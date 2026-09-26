import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AVATAR_BUCKET, SUPABASE_URL, isSupabaseConfigured } from './env';
import { PAGE_SIZE, clampPage, pageCount } from './pagination';
import { toPlayerMap } from './players';
import { sampleDays, samplePlayers } from './sample-data';
import { getPublicClient } from './supabase/public';
import { MATCH_TYPES, type DayStatus, type MatchDay, type MatchType, type Player, type PlayerMap } from './types';

// ---- Row shapes & mapping ------------------------------------------------

export interface PlayerRow {
  id: string;
  name: string;
  avatar_path: string | null;
  handle: string;
  personal_quote: string | null;
}

interface DayRow {
  id: string;
  date: string;
  status: DayStatus;
  matches: { type: MatchType; scores: { player_id: string; score: number }[] }[];
}

export const DAY_SELECT = 'id, date, status, matches(type, scores(player_id, score))';

/** avatar_path is a storage object path, or a full URL (seeded sample photos). */
export function avatarUrl(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

export const PLAYER_SELECT = 'id, name, avatar_path, handle, personal_quote';

export const mapPlayer = (row: PlayerRow): Player => ({
  id: row.id,
  name: row.name,
  avatarUrl: avatarUrl(row.avatar_path),
  handle: row.handle,
  quote: row.personal_quote,
});

export function mapDay(row: DayRow): MatchDay {
  const matches = MATCH_TYPES.flatMap(({ type }) => {
    const match = row.matches.find((m) => m.type === type);
    if (!match || match.scores.length === 0) return [];
    return [{ type, rows: match.scores.map((s) => ({ playerId: s.player_id, score: s.score })) }];
  });
  return { id: row.id, date: row.date, status: row.status, matches };
}

const byDateDesc = (a: MatchDay, b: MatchDay) => b.date.localeCompare(a.date);
const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

// ---- Shared queries (public client here, cookie client in /manage) --------

export async function fetchPlayers(supabase: SupabaseClient): Promise<Player[]> {
  const { data, error } = await supabase.from('players').select(PLAYER_SELECT).order('name');
  if (error) throw error;
  return (data as PlayerRow[]).map(mapPlayer);
}

export async function fetchDays(
  supabase: SupabaseClient,
  {
    status,
    date,
    before,
    limit,
    offset = 0,
  }: { status?: DayStatus; date?: string; before?: string; limit?: number; offset?: number } = {},
): Promise<MatchDay[]> {
  let query = supabase.from('match_days').select(DAY_SELECT).order('date', { ascending: false });
  if (status) query = query.eq('status', status);
  if (date) query = query.eq('date', date);
  if (before) query = query.lte('date', before);
  if (limit) query = offset > 0 ? query.range(offset, offset + limit - 1) : query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as DayRow[]).map(mapDay);
}

/**
 * One page of days plus the total row count for the same filters, in a SINGLE request:
 * PostgREST returns the total in Content-Range when a count is asked for, so there is no
 * need for a separate head-count round trip.
 *
 * `playerId` keeps only days that player scored in. It filters through a second, aliased
 * inner embed (`played`), so the regular `matches` embed still carries every player's scores.
 */
export async function fetchDaysWithCount(
  supabase: SupabaseClient,
  {
    status,
    before,
    playerId,
    limit,
    offset = 0,
  }: { status?: DayStatus; before?: string; playerId?: string; limit: number; offset?: number },
): Promise<{ days: MatchDay[]; total: number }> {
  const select = playerId ? `${DAY_SELECT}, played:matches!inner(scores!inner(player_id))` : DAY_SELECT;
  let query = supabase.from('match_days').select(select, { count: 'exact' }).order('date', { ascending: false });
  if (status) query = query.eq('status', status);
  if (before) query = query.lte('date', before);
  if (playerId) query = query.eq('played.scores.player_id', playerId);
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { days: ((data ?? []) as unknown as DayRow[]).map(mapDay), total: count ?? 0 };
}

/** Rows + total for `page`, re-fetching only when the requested page turned out to be out of range. */
async function pageOfDays(
  supabase: SupabaseClient,
  {
    status,
    before,
    playerId,
    page,
    pageSize,
  }: { status?: DayStatus; before?: string; playerId?: string; page: number; pageSize: number },
): Promise<DaysPage> {
  const requested = Number.isInteger(page) && page >= 1 ? page : 1;
  const first = await fetchDaysWithCount(supabase, { status, before, playerId, limit: pageSize, offset: (requested - 1) * pageSize });
  const { total } = first;
  const current = clampPage(requested, total, pageSize);

  const days =
    current === requested
      ? first.days
      : (await fetchDaysWithCount(supabase, { status, before, playerId, limit: pageSize, offset: (current - 1) * pageSize })).days;

  return { days, total, page: current, pageCount: pageCount(total, pageSize) };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchDayById(supabase: SupabaseClient, id: string): Promise<MatchDay | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabase.from('match_days').select(DAY_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapDay(data as unknown as DayRow) : null;
}

/**
 * Admin day setups list: all days (drafts included), newest first, one page at a time.
 * Optionally narrowed to days on or before `from` and/or a single status.
 */
export async function fetchDaysPage(
  supabase: SupabaseClient,
  { from, status, page, pageSize }: { from?: string; status?: DayStatus; page: number; pageSize: number },
): Promise<DaysPage> {
  const before = from && isIsoDate(from) ? from : undefined;
  return pageOfDays(supabase, { status, before, page, pageSize });
}

// ---- Public site -----------------------------------------------------------

/**
 * Cross-request data cache for the public read paths. The routes themselves stay dynamic
 * (they read searchParams), so caching the *data* is what removes the Supabase round trips.
 * /manage actions invalidate these by tag — see refreshPublicPages in app/manage/actions.ts.
 * The sample-data paths are local and stay uncached.
 */
export const DAYS_TAG = 'days';
export const PLAYERS_TAG = 'players';
const CACHE_SECONDS = 300;

const loadPlayers = unstable_cache(async (): Promise<Player[]> => fetchPlayers(getPublicClient()), ['players'], {
  tags: [PLAYERS_TAG],
  revalidate: CACHE_SECONDS,
});

export const getPlayers = cache(async (): Promise<PlayerMap> => {
  const players = isSupabaseConfigured ? await loadPlayers() : samplePlayers;
  return toPlayerMap(players);
});

/** Looked up in the cached player list, so a profile costs no extra query. */
export async function getPlayerByHandle(handle: string): Promise<Player | null> {
  const wanted = handle.toLowerCase();
  return Object.values(await getPlayers()).find((player) => player.handle === wanted) ?? null;
}

const loadPublishedDays = unstable_cache(
  async (limit: number): Promise<MatchDay[]> => fetchDays(getPublicClient(), { status: 'published', limit }),
  ['published-days'],
  { tags: [DAYS_TAG], revalidate: CACHE_SECONDS },
);

export async function getPublishedDays(limit: number): Promise<MatchDay[]> {
  if (!isSupabaseConfigured) {
    return sampleDays.filter((day) => day.status === 'published').sort(byDateDesc).slice(0, limit);
  }
  return loadPublishedDays(limit);
}

const loadPublishedDayByDate = unstable_cache(
  async (date: string): Promise<MatchDay | null> =>
    (await fetchDays(getPublicClient(), { status: 'published', date }))[0] ?? null,
  ['published-day'],
  { tags: [DAYS_TAG], revalidate: CACHE_SECONDS },
);

/** A specific published day if `date` matches one, otherwise the latest published day. */
export async function getPublishedDay(date?: string): Promise<MatchDay | null> {
  if (date && isIsoDate(date)) {
    const match = isSupabaseConfigured
      ? await loadPublishedDayByDate(date)
      : sampleDays.find((day) => day.status === 'published' && day.date === date);
    if (match) return match;
  }
  const [latest] = await getPublishedDays(1);
  return latest ?? null;
}

export interface DaysPage {
  days: MatchDay[];
  total: number;
  page: number;
  pageCount: number;
}

const loadPublishedDaysPage = unstable_cache(
  async (before: string | null, page: number): Promise<DaysPage> =>
    pageOfDays(getPublicClient(), { status: 'published', before: before ?? undefined, page, pageSize: PAGE_SIZE }),
  ['published-days-page'],
  { tags: [DAYS_TAG], revalidate: CACHE_SECONDS },
);

/** History: published days newest first, optionally starting from (on or before) `from`, 5 per page. */
export async function getPublishedDaysPage({ from, page }: { from?: string; page: number }): Promise<DaysPage> {
  const before = from && isIsoDate(from) ? from : undefined;

  if (!isSupabaseConfigured) {
    const all = sampleDays
      .filter((day) => day.status === 'published' && (!before || day.date <= before))
      .sort(byDateDesc);
    const current = clampPage(page, all.length);
    const start = (current - 1) * PAGE_SIZE;
    return { days: all.slice(start, start + PAGE_SIZE), total: all.length, page: current, pageCount: pageCount(all.length) };
  }

  return loadPublishedDaysPage(before ?? null, page);
}

const loadPlayerDaysPage = unstable_cache(
  async (playerId: string, page: number): Promise<DaysPage> =>
    pageOfDays(getPublicClient(), { status: 'published', playerId, page, pageSize: PAGE_SIZE }),
  ['player-days-page'],
  { tags: [DAYS_TAG], revalidate: CACHE_SECONDS },
);

/** Profile history: published days the player scored in, newest first, 5 per page. */
export async function getPlayerDaysPage({ playerId, page }: { playerId: string; page: number }): Promise<DaysPage> {
  if (!isSupabaseConfigured) {
    const all = sampleDays
      .filter((day) => day.status === 'published' && day.matches.some((m) => m.rows.some((r) => r.playerId === playerId)))
      .sort(byDateDesc);
    const current = clampPage(page, all.length);
    const start = (current - 1) * PAGE_SIZE;
    return { days: all.slice(start, start + PAGE_SIZE), total: all.length, page: current, pageCount: pageCount(all.length) };
  }

  return loadPlayerDaysPage(playerId, page);
}
