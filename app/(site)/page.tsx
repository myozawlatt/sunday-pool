import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { ShareResults } from '@/components/ShareResults';
import { FixtureGrid } from '@/components/FixtureCard';
import { ResultBoard } from '@/components/ResultBoard';
import { formatDate, weekday } from '@/lib/format';
import { getPlayers, getPublishedDay } from '@/lib/queries';

type SearchParams = Promise<{ date?: string | string[] }>;

/** Link previews (Facebook, Viber, …) for a shared `/?date=`: the day's results as /api/og draws them. */
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { date } = await searchParams;
  const day = await getPublishedDay(typeof date === 'string' ? date : undefined);
  if (!day) return {};

  // No metadataBase is configured, and crawlers need absolute URLs, so they come from the request's host
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const origin = `${requestHeaders.get('x-forwarded-proto') ?? 'https'}://${host}`;
  const title = `Sunday Pool · ${formatDate(day.date)}`;
  const description = `Card & Snooker results for ${weekday(day.date)} ${formatDate(day.date)}`;
  const image = { url: `${origin}/api/og?date=${day.date}`, width: 1200, height: 630, alt: title };

  return {
    openGraph: { type: 'website', siteName: 'Sunday Pool', url: `${origin}/?date=${day.date}`, title, description, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  };
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
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
        <ShareResults key={day.date} date={day.date} label={formatDate(day.date)} />
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
