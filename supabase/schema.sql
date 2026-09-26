-- ============================================================================
-- Sunday Pool — database schema
-- Run once in Supabase → SQL Editor. Then, in Authentication → Sign In / Providers,
-- turn OFF "Allow new users to sign up" and add your admin user under Users.
-- ============================================================================

-- ---- Tables -----------------------------------------------------------------

create table public.players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  avatar_path text,                       -- storage path in the "avatars" bucket, or a full URL
  handle      text not null unique check (handle ~ '^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$'),  -- /player/{handle}
  personal_quote text check (personal_quote is null or char_length(personal_quote) between 1 and 280),
  created_at  timestamptz not null default now()
);

create table public.match_days (
  id           uuid primary key default gen_random_uuid(),
  date         date not null unique,
  status       text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  match_day_id uuid not null references public.match_days (id) on delete cascade,
  type         text not null check (type in ('card', 'snooker')),
  unique (match_day_id, type)             -- a day has at most one Card and one Snooker match
);

create table public.scores (
  id        uuid primary key default gen_random_uuid(),
  match_id  uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  score     integer not null check (score >= 0),
  unique (match_id, player_id)
);

create index matches_match_day_id_idx on public.matches (match_day_id);
create index scores_match_id_idx on public.scores (match_id);
create index scores_player_id_idx on public.scores (player_id);

-- ---- Row Level Security ------------------------------------------------------
-- Visitors (anon) can read players and anything belonging to a published day.
-- The signed-in admin (authenticated) can do everything. Keep public sign-ups disabled!

alter table public.players    enable row level security;
alter table public.match_days enable row level security;
alter table public.matches    enable row level security;
alter table public.scores     enable row level security;

create policy "Public reads players" on public.players
  for select to anon using (true);

create policy "Public reads published days" on public.match_days
  for select to anon using (status = 'published');

create policy "Public reads matches of published days" on public.matches
  for select to anon using (
    exists (select 1 from public.match_days d where d.id = match_day_id and d.status = 'published')
  );

create policy "Public reads scores of published days" on public.scores
  for select to anon using (
    exists (
      select 1 from public.matches m
      join public.match_days d on d.id = m.match_day_id
      where m.id = match_id and d.status = 'published'
    )
  );

create policy "Admin manages players"    on public.players    for all to authenticated using (true) with check (true);
create policy "Admin manages match days" on public.match_days for all to authenticated using (true) with check (true);
create policy "Admin manages matches"    on public.matches    for all to authenticated using (true) with check (true);
create policy "Admin manages scores"     on public.scores     for all to authenticated using (true) with check (true);

-- ---- Save a whole match day in one transaction --------------------------------
-- payload: { id?, date: 'YYYY-MM-DD', status: 'draft'|'published',
--            matches: [{ type: 'card'|'snooker', rows: [{ playerId, score }] }] }

create or replace function public.save_match_day(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_day_id   uuid := nullif(payload ->> 'id', '')::uuid;
  v_status   text := payload ->> 'status';
  v_match    jsonb;
  v_match_id uuid;
begin
  if v_status not in ('draft', 'published') then
    raise exception 'Invalid status: %', v_status;
  end if;

  if v_day_id is null then
    insert into match_days (date, status, published_at)
    values ((payload ->> 'date')::date, v_status, case when v_status = 'published' then now() end)
    returning id into v_day_id;
  else
    update match_days
       set date         = (payload ->> 'date')::date,
           status       = v_status,
           published_at = case when v_status = 'published' then coalesce(published_at, now()) end,
           updated_at   = now()
     where id = v_day_id;
    if not found then
      raise exception 'Match day not found';
    end if;
    delete from matches where match_day_id = v_day_id;   -- scores cascade
  end if;

  for v_match in select * from jsonb_array_elements(coalesce(payload -> 'matches', '[]'::jsonb)) loop
    insert into matches (match_day_id, type)
    values (v_day_id, v_match ->> 'type')
    returning id into v_match_id;

    insert into scores (match_id, player_id, score)
    select v_match_id, (r ->> 'playerId')::uuid, (r ->> 'score')::integer
      from jsonb_array_elements(v_match -> 'rows') as r;
  end loop;

  return v_day_id;
end;
$$;

revoke execute on function public.save_match_day(jsonb) from public, anon;
grant execute on function public.save_match_day(jsonb) to authenticated, service_role;

-- ---- Player photos --------------------------------------------------------------
-- Public bucket: anyone can view photos by URL; only the admin can upload/replace/delete.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Admin reads avatars"   on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy "Admin uploads avatars" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
create policy "Admin updates avatars" on storage.objects for update to authenticated using (bucket_id = 'avatars');
create policy "Admin deletes avatars" on storage.objects for delete to authenticated using (bucket_id = 'avatars');
