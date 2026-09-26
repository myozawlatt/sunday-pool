import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/Avatar';
import { DayCard } from '@/components/DayCard';
import { Pager } from '@/components/Pager';
import { parsePage } from '@/lib/pagination';
import { getPlayerByHandle, getPlayerDaysPage, getPlayers } from '@/lib/queries';

type Params = Promise<{ handle: string }>;
type SearchParams = Promise<{ page?: string | string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const player = await getPlayerByHandle((await params).handle);
  return { title: player?.name ?? 'Player not found' };
}

export default async function PlayerPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ handle }, { page: rawPage }] = await Promise.all([params, searchParams]);
  const player = await getPlayerByHandle(handle);
  if (!player) notFound();

  const [{ days, page, pageCount }, players] = await Promise.all([
    getPlayerDaysPage({ playerId: player.id, page: parsePage(Array.isArray(rawPage) ? rawPage[0] : rawPage) }),
    getPlayers(),
  ]);
  const quote = player.quote?.trim();

  return (
    <>
      <section className="page-head profile">
        <Avatar player={player} size="xl" eager />
        <h1 className="page-title profile__name">{player.name}</h1>
        {quote ? (
          <blockquote className="profile__quote" lang="my">
            <p>{quote}</p>
          </blockquote>
        ) : (
          <p className="profile__quote profile__quote--empty">No quote.</p>
        )}
        <div className="cue" aria-hidden="true" />
      </section>

      <section aria-labelledby="profile-history">
        <div className="section-head">
          <h2 className="section-title" id="profile-history">
            Match history
          </h2>
        </div>
        <div className="history-list">
          {days.length > 0 ? (
            days.map((day, i) => (
              <DayCard
                key={day.id}
                // only the matches this player played on the day
                day={{ ...day, matches: day.matches.filter((m) => m.rows.some((r) => r.playerId === player.id)) }}
                players={players}
                highlightId={player.id}
                eager={i === 0}
              />
            ))
          ) : (
            <p className="empty-note">No published matches yet.</p>
          )}
        </div>
        <Pager basePath={`/player/${player.handle}`} page={page} pageCount={pageCount} label="Match history pages" />
      </section>
    </>
  );
}
