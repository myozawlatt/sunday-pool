import type { Metadata } from 'next';
import Link from 'next/link';
import { DayCard } from '@/components/DayCard';
import { Pager } from '@/components/Pager';
import { formatDate } from '@/lib/format';
import { parsePage } from '@/lib/pagination';
import { getPlayers, getPublishedDaysPage } from '@/lib/queries';

export const metadata: Metadata = { title: 'History' };

type SearchParams = Promise<{ from?: string | string[]; page?: string | string[] }>;

const single = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawFrom = single(params.from);
  // ?from=YYYY-MM-DD starts the list at that date (on or before it); ?page=N pages 5 days at a time
  const from = rawFrom && /^\d{4}-\d{2}-\d{2}$/.test(rawFrom) ? rawFrom : undefined;

  const [{ days, page, pageCount }, players] = await Promise.all([
    getPublishedDaysPage({ from, page: parsePage(single(params.page)) }),
    getPlayers(),
  ]);

  return (
    <>
      <section className="page-head">
        <p className="eyebrow">Last 5 match days</p>
        <h1 className="page-title">History</h1>
        <div className="cue" aria-hidden="true" />
      </section>

      <form className="history-search" action="/history" method="get" role="search">
        <label className="history-search__field">
          <span className="history-search__label">Start from</span>
          <input className="history-search__input" type="date" name="from" defaultValue={from} required />
        </label>
        <button className="history-search__button" type="submit">
          Search
        </button>
        {from && (
          <Link className="history-search__clear" href="/history">
            Clear
          </Link>
        )}
      </form>
      {from && <p className="history-status">Showing match days on or before {formatDate(from)}</p>}

      <div className="history-list">
        {days.length > 0 ? (
          days.map((day, i) => (
            <DayCard
              key={day.id}
              day={day}
              players={players}
              latest={!from && page === 1 && i === 0}
              eager={i === 0}
            />
          ))
        ) : (
          <p className="empty-note">
            {from ? `No published match days on or before ${formatDate(from)}.` : 'No match days published yet.'}
          </p>
        )}
      </div>

      <Pager basePath="/history" page={page} pageCount={pageCount} params={{ from }} label="History pages" />
    </>
  );
}
