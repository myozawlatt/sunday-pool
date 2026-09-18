import Link from 'next/link';
import { pageHref, pageWindow } from '@/lib/pagination';

interface PagerProps {
  /** e.g. "/history" or "/manage" */
  basePath: string;
  page: number;
  pageCount: number;
  /** Extra query params kept in every link, e.g. History's { from } */
  params?: Record<string, string | undefined>;
  label?: string;
}

/** ← Newer · page numbers · Older →. Renders only when there is more than one page. */
export function Pager({ basePath, page, pageCount, params = {}, label = 'Pages' }: PagerProps) {
  if (pageCount <= 1) return null;

  const href = (target: number) => pageHref(basePath, target, params);

  return (
    <nav className="pager" aria-label={label}>
      {page > 1 ? (
        <Link className="pager__step" href={href(page - 1)} rel="prev">
          ← Newer
        </Link>
      ) : (
        <span className="pager__step is-disabled" aria-hidden="true">
          ← Newer
        </span>
      )}

      <ol className="pager__pages">
        {pageWindow(page, pageCount).map((item, i) =>
          item === 'gap' ? (
            <li key={`gap-${i}`} className="pager__gap" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                className={`pager__page${item === page ? ' is-current' : ''}`}
                href={href(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ol>

      {page < pageCount ? (
        <Link className="pager__step" href={href(page + 1)} rel="next">
          Older →
        </Link>
      ) : (
        <span className="pager__step is-disabled" aria-hidden="true">
          Older →
        </span>
      )}
    </nav>
  );
}
