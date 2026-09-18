import type { Metadata } from 'next';
import { AddPlayerForm, PlayerRowForm } from '@/components/manage/PlayerForms';
import { requireAdmin } from '@/lib/auth';
import { fetchPlayers } from '@/lib/queries';

export const metadata: Metadata = { title: 'Players' };

export default async function PlayersPage() {
  const { supabase } = await requireAdmin();
  const players = await fetchPlayers(supabase);

  return (
    <>
      <div className="manage-head">
        <div>
          <h1 className="manage-title">Players</h1>
          <p className="manage-sub">Photos are cropped square and resized before upload.</p>
        </div>
      </div>

      <section className="panel">
        <h2 className="panel__title">Add player</h2>
        <AddPlayerForm />
      </section>

      <section className="panel">
        <h2 className="panel__title">All players ({players.length})</h2>
        {players.length > 0 ? (
          <ul className="player-list">
            {players.map((player) => (
              <li key={player.id} className="player-row">
                <PlayerRowForm player={player} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-note">No players yet.</p>
        )}
      </section>
    </>
  );
}
