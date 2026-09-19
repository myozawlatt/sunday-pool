import Link from 'next/link';
import { DownloadResults } from '@/components/DownloadResults';
import { FixtureGrid } from '@/components/FixtureCard';
import { ResultBoard } from '@/components/ResultBoard';
import { formatDate, weekday } from '@/lib/format';
import { getPlayers, getPublishedDay } from '@/lib/queries';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const { date } = await searchParams;
  // ?date=YYYY-MM-DD previews another published match day; defaults to the latest
  const [day, players] = await Promise.all([
    getPublishedDay(typeof date === 'string' ? date : undefined),
    getPlayers(),
  ]);

  if (!day) {
    return (
      <section className="hero">
        <p className="eyebrow">Match Day</p>
        <h1 className="hero__date">No results yet</h1>
        <div className="cue" aria-hidden="true" />
      </section>
    );
  }

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Match Day · {weekday(day.date)}</p>
        <h1 className="hero__date">{formatDate(day.date)}</h1>
        <div className="cue" aria-hidden="true" />
        <DownloadResults date={day.date} label={formatDate(day.date)} />
      </section>

      <section className={`spotlight${day.matches.length === 1 ? ' spotlight--single' : ''}`} aria-label="Match results">
        {day.matches.map((match) => (
          <ResultBoard key={match.type} match={match} players={players} />
        ))}
      </section>

      <section aria-labelledby="fixtures-title">
        <div className="section-head">
          <h2 className="section-title" id="fixtures-title">
            Fixtures
          </h2>
          <Link className="link-more" href="/history" data-capture-exclude>
            View history →
          </Link>
        </div>
        <FixtureGrid day={day} players={players} />
      </section>
    </>
  );
}
