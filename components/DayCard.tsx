import Link from 'next/link';
import { FixtureGrid } from './FixtureCard';
import { formatDate, weekday } from '@/lib/format';
import type { MatchDay, PlayerMap } from '@/lib/types';

/**
 * `eager` skips lazy-loading for the first card, whose avatars are above the fold.
 * `highlightId` marks that player's rows (profile history).
 */
export function DayCard({
  day,
  players,
  latest = false,
  eager = false,
  highlightId,
}: { day: MatchDay; players: PlayerMap; latest?: boolean; eager?: boolean; highlightId?: string }) {
  return (
    <section className="day-card" aria-labelledby={`day-${day.date}`}>
      <header className="day-card__head">
        <div className="day-card__when">
          <h2 className="day-card__date" id={`day-${day.date}`}>
            {formatDate(day.date)}
            {latest && <span className="pill day-card__latest">Latest</span>}
          </h2>
          <p className="day-card__weekday">{weekday(day.date)}</p>
        </div>
        <Link
          className="link-more"
          href={`/?date=${day.date}`}
          aria-label={`View results for ${formatDate(day.date)}`}
        >
          VIEW MATCH
        </Link>
      </header>
      <FixtureGrid day={day} players={players} showResults eager={eager} highlightId={highlightId} />
    </section>
  );
}
