import Link from 'next/link';
import { Pager } from '@/components/Pager';
import { ConfirmButton } from '@/components/manage/ConfirmButton';
import { requireAdmin } from '@/lib/auth';
import { formatDate, weekday } from '@/lib/format';
import { MANAGE_PAGE_SIZE, parsePage } from '@/lib/pagination';
import { fetchDaysPage } from '@/lib/queries';
import { matchTitle, type DayStatus } from '@/lib/types';
import { deleteDay, setDayStatus } from '../actions';

type SearchParams = Promise<{ from?: string | string[]; status?: string | string[]; page?: string | string[] }>;

const single = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

export default async function ManageDaysPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // ?from=YYYY-MM-DD lists days on or before that date; ?status= narrows to drafts or published
  const rawFrom = single(params.from);
  const from = rawFrom && /^\d{4}-\d{2}-\d{2}$/.test(rawFrom) ? rawFrom : undefined;
  const rawStatus = single(params.status);
  const status: DayStatus | undefined = rawStatus === 'draft' || rawStatus === 'published' ? rawStatus : undefined;
  const filtered = Boolean(from || status);

  const { supabase } = await requireAdmin();
  // 10 match days per page, drafts included
  const { days, total, page, pageCount } = await fetchDaysPage(supabase, {
    from,
    status,
    page: parsePage(single(params.page)),
    pageSize: MANAGE_PAGE_SIZE,
  });

  return (
    <>
      <div className="manage-head">
        <div>
          <h1 className="manage-title">Match days</h1>
          <p className="manage-sub">
            {total} match day{total === 1 ? '' : 's'}
            {filtered ? ' found' : ''} · drafts are hidden from the public site until you publish them.
          </p>
        </div>
        <Link className="btn btn--primary" href="/manage/days/new">
          + New match day
        </Link>
      </div>

      <form className="manage-filter" action="/manage" method="get" role="search">
        <label className="field">
          <span className="field__label">Start from</span>
          <input className="input" type="date" name="from" defaultValue={from} />
        </label>
        <label className="field">
          <span className="field__label">Status</span>
          <select className="input" name="status" defaultValue={status ?? ''}>
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <button className="btn btn--primary" type="submit">
          Search
        </button>
        {filtered && (
          <Link className="btn btn--ghost" href="/manage">
            Clear
          </Link>
        )}
      </form>

      {total === 0 ? (
        <div className="panel">
          <p className="empty-note">{filtered ? 'No match days match this search.' : 'No match days yet.'}</p>
        </div>
      ) : (
        <ul className="day-list">
          {days.map((day) => {
            const published = day.status === 'published';
            return (
              <li key={day.id} className="day-row">
                <div className="day-row__main">
                  <p className="day-row__date">
                    {formatDate(day.date)}
                    <span className={`status status--${day.status}`}>{published ? 'Published' : 'Draft'}</span>
                  </p>
                  <p className="day-row__meta">
                    {weekday(day.date)} ·{' '}
                    {day.matches.map((m) => `${matchTitle(m.type)} (${m.rows.length})`).join(' · ') || 'No matches'}
                  </p>
                </div>
                <div className="day-row__actions">
                  <Link className="btn btn--small" href={`/manage/days/${day.id}`}>
                    Edit
                  </Link>
                  <form action={setDayStatus}>
                    <input type="hidden" name="id" value={day.id} />
                    <input type="hidden" name="status" value={published ? 'draft' : 'published'} />
                    <button className="btn btn--small" type="submit">
                      {published ? 'Unpublish' : 'Publish'}
                    </button>
                  </form>
                  <form action={deleteDay}>
                    <input type="hidden" name="id" value={day.id} />
                    <ConfirmButton className="btn btn--small btn--danger" message={`Delete ${formatDate(day.date)}? This can't be undone.`}>
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pager basePath="/manage" page={page} pageCount={pageCount} params={{ from, status }} label="Match day pages" />
    </>
  );
}
