import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DayForm } from '@/components/manage/DayForm';
import { requireAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { fetchDayById, fetchPlayers } from '@/lib/queries';
import { saveDay } from '../../../actions';

export const metadata: Metadata = { title: 'Edit match day' };

export default async function EditDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [day, players] = await Promise.all([fetchDayById(supabase, id), fetchPlayers(supabase)]);
  if (!day) notFound();

  return (
    <>
      <div className="manage-head">
        <div>
          <h1 className="manage-title">{formatDate(day.date)}</h1>
          <p className="manage-sub">
            {day.status === 'published' ? 'Published — changes go live when you update.' : 'Draft — not visible on the public site.'}
          </p>
        </div>
        <Link className="btn btn--ghost" href="/manage">
          Back
        </Link>
      </div>

      <DayForm players={players} day={day} defaultDate={day.date} save={saveDay} />
    </>
  );
}
