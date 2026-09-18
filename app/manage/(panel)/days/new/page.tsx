import type { Metadata } from 'next';
import Link from 'next/link';
import { DayForm } from '@/components/manage/DayForm';
import { requireAdmin } from '@/lib/auth';
import { fetchPlayers } from '@/lib/queries';
import { saveDay } from '../../../actions';

export const metadata: Metadata = { title: 'New match day' };

export default async function NewDayPage() {
  const { supabase } = await requireAdmin();
  const players = await fetchPlayers(supabase);

  return (
    <>
      <div className="manage-head">
        <div>
          <h1 className="manage-title">New match day</h1>
          <p className="manage-sub">Save a draft to finish later, or publish it straight away.</p>
        </div>
        <Link className="btn btn--ghost" href="/manage">
          Cancel
        </Link>
      </div>

      {players.length < 2 ? (
        <p className="notice">
          Add at least 2 players first on the <Link href="/manage/players">Players</Link> page.
        </p>
      ) : (
        <DayForm players={players} defaultDate={new Date().toISOString().slice(0, 10)} save={saveDay} />
      )}
    </>
  );
}
