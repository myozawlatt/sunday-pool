-- ============================================================================
-- Player profiles: adds players.handle (/player/{handle}) and players.personal_quote.
-- For projects created before 2026-09-26 — run once in Supabase → SQL Editor.
-- (supabase/schema.sql already includes both columns for new projects.)
-- ============================================================================

alter table public.players add column handle text;
alter table public.players add column personal_quote text;

-- Backfill handles from names ("Alex Tan" → alex-tan). Names that don't slugify
-- (e.g. Burmese), are too long or collide fall back to player-<first 8 of id>.
with slugs as (
  select id, btrim(lower(regexp_replace(btrim(name), '[^A-Za-z0-9]+', '-', 'g')), '-') as slug
    from public.players
),
ranked as (
  select id, slug, row_number() over (partition by slug order by id) as n
    from slugs
)
update public.players p
   set handle = case
                  when r.slug ~ '^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$' and r.n = 1 then r.slug
                  else 'player-' || left(p.id::text, 8)
                end
  from ranked r
 where r.id = p.id;

alter table public.players alter column handle set not null;
alter table public.players add constraint players_handle_key unique (handle);
alter table public.players add constraint players_handle_check
  check (handle ~ '^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$');
alter table public.players add constraint players_personal_quote_check
  check (personal_quote is null or char_length(personal_quote) between 1 and 280);
