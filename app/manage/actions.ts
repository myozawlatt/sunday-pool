'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth';
import { validateDayPayload, type DayPayload } from '@/lib/day-form';
import { AVATAR_BUCKET, isSupabaseConfigured } from '@/lib/env';
import { DAYS_TAG, PLAYERS_TAG } from '@/lib/queries';
import { createServerSupabase } from '@/lib/supabase/server';

export type ActionState = { error?: string; ok?: string } | undefined;

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function refreshPublicPages() {
  // updateTag, not revalidateTag: every caller here is a Server Action, and an admin must see
  // their publish immediately. updateTag expires the entry so the next read is fresh, whereas
  // revalidateTag(tag, 'max') would serve stale content while refreshing in the background.
  updateTag(DAYS_TAG);
  updateTag(PLAYERS_TAG);
  // Paths additionally clear the client router cache so a navigation shows the change at once.
  revalidatePath('/');
  revalidatePath('/history');
}

// ---- Auth ----------------------------------------------------------------------

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) return { error: 'Supabase is not configured yet.' };

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Wrong email or password.' };

  redirect('/manage');
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect('/manage/gate');
}

// ---- Match days -------------------------------------------------------------------

export async function saveDay(payload: DayPayload): Promise<{ error: string } | void> {
  const { supabase } = await requireAdmin();

  const problems = validateDayPayload(payload);
  if (problems.length > 0) return { error: problems.join(' ') };

  const { error } = await supabase.rpc('save_match_day', { payload });
  if (error) {
    return { error: error.code === '23505' ? 'There is already a match day on this date.' : error.message };
  }

  refreshPublicPages();
  revalidatePath('/manage');
  redirect('/manage');
}

export async function setDayStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get('id'));
  const status = formData.get('status') === 'published' ? 'published' : 'draft';
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('match_days')
    .update({ status, published_at: status === 'published' ? now : null, updated_at: now })
    .eq('id', id);
  if (error) throw new Error(error.message);

  refreshPublicPages();
  revalidatePath('/manage');
}

export async function deleteDay(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('match_days').delete().eq('id', String(formData.get('id')));
  if (error) throw new Error(error.message);

  refreshPublicPages();
  revalidatePath('/manage');
}

// ---- Players ------------------------------------------------------------------------

async function uploadPhoto(supabase: SupabaseClient, playerId: string, photo: FormDataEntryValue | null) {
  if (!(photo instanceof File) || photo.size === 0) return { path: null };
  if (!photo.type.startsWith('image/')) return { error: 'The photo must be an image.' };
  if (photo.size > MAX_PHOTO_BYTES) return { error: 'The photo is too large (2 MB max).' };

  const extension = photo.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${playerId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, photo, { contentType: photo.type, cacheControl: '31536000' });
  return error ? { error: `Photo upload failed: ${error.message}` } : { path };
}

async function removePhoto(supabase: SupabaseClient, path: string | null) {
  if (path && !/^https?:\/\//.test(path)) await supabase.storage.from(AVATAR_BUCKET).remove([path]);
}

function readName(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  return name.length >= 1 && name.length <= 60 ? name : null;
}

export async function addPlayer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const name = readName(formData);
  if (!name) return { error: 'Enter a name (up to 60 characters).' };

  const { data, error } = await supabase.from('players').insert({ name }).select('id').single();
  if (error) return { error: error.message };

  const upload = await uploadPhoto(supabase, data.id, formData.get('photo'));
  if (upload.error) return { error: `${name} was added, but ${upload.error.charAt(0).toLowerCase()}${upload.error.slice(1)}` };
  if (upload.path) await supabase.from('players').update({ avatar_path: upload.path }).eq('id', data.id);

  refreshPublicPages();
  revalidatePath('/manage/players');
  return { ok: `${name} added.` };
}

export async function updatePlayer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get('id'));
  const name = readName(formData);
  if (!name) return { error: 'Enter a name (up to 60 characters).' };

  const { data: current, error: readError } = await supabase.from('players').select('avatar_path').eq('id', id).single();
  if (readError) return { error: readError.message };

  const upload = await uploadPhoto(supabase, id, formData.get('photo'));
  if (upload.error) return { error: upload.error };

  const changes = upload.path ? { name, avatar_path: upload.path } : { name };
  const { error } = await supabase.from('players').update(changes).eq('id', id);
  if (error) return { error: error.message };
  if (upload.path) await removePhoto(supabase, current.avatar_path);

  refreshPublicPages();
  revalidatePath('/manage/players');
  return { ok: 'Saved.' };
}

export async function deletePlayer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get('id'));

  const { count } = await supabase.from('scores').select('id', { count: 'exact', head: true }).eq('player_id', id);
  if (count) return { error: 'This player has scores in match days, so they can’t be deleted.' };

  const { data, error } = await supabase.from('players').delete().eq('id', id).select('avatar_path').single();
  if (error) return { error: error.code === '23503' ? 'This player has scores in match days.' : error.message };
  await removePhoto(supabase, data.avatar_path);

  refreshPublicPages();
  revalidatePath('/manage/players');
  return { ok: 'Player deleted.' };
}
