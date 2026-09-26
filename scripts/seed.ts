/**
 * Loads lib/sample-data.ts into an empty Supabase project.
 * Usage: npm run seed   (reads .env.local — needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY)
 */
import { createClient } from '@supabase/supabase-js';
import { sampleDays, samplePlayers } from '../lib/sample-data.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const [{ count: dayCount }, { count: playerCount }] = await Promise.all([
  supabase.from('match_days').select('id', { count: 'exact', head: true }),
  supabase.from('players').select('id', { count: 'exact', head: true }),
]);
if (dayCount || playerCount) {
  console.error('The database already has players or match days — seed skipped.');
  process.exit(1);
}

const playerIds = new Map<string, string>();
for (const player of samplePlayers) {
  const { data, error } = await supabase
    .from('players')
    .insert({ name: player.name, avatar_path: player.avatarUrl, handle: player.handle, personal_quote: player.quote })
    .select('id')
    .single();
  if (error) throw error;
  playerIds.set(player.id, data.id);
}

for (const day of sampleDays) {
  const payload = {
    date: day.date,
    status: day.status,
    matches: day.matches.map((match) => ({
      type: match.type,
      rows: match.rows.map((row) => ({ playerId: playerIds.get(row.playerId), score: row.score })),
    })),
  };
  const { error } = await supabase.rpc('save_match_day', { payload });
  if (error) throw error;
}

console.log(`Seeded ${samplePlayers.length} players and ${sampleDays.length} match days.`);
