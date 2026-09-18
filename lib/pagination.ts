/** History shows a fixed 5 match days per page. */
export const PAGE_SIZE = 5;

/** The admin day setups list shows 10 match days per page. */
export const MANAGE_PAGE_SIZE = 10;

export type PageItem = number | 'gap';

export const pageCount = (total: number, size = PAGE_SIZE) => Math.max(1, Math.ceil(total / size));

/** A usable page number from a query-string value (anything invalid becomes page 1). */
export function parsePage(value: unknown): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** Keeps a requested page within 1…last page. */
export function clampPage(page: number, total: number, size = PAGE_SIZE): number {
  if (!Number.isInteger(page) || page < 1) return 1;
  return Math.min(page, pageCount(total, size));
}

/** Page links to show: all of them when there are few, otherwise first, last and neighbours with gaps. */
export function pageWindow(current: number, count: number): PageItem[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);

  const pages = [...new Set([1, current - 1, current, current + 1, count])]
    .filter((page) => page >= 1 && page <= count)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  pages.forEach((page, i) => {
    if (i > 0 && page - pages[i - 1] > 1) items.push('gap');
    items.push(page);
  });
  return items;
}

/** Link to a page, keeping other query params (e.g. History's `from`); page 1 has no `page` param. */
export function pageHref(basePath: string, page: number, params: Record<string, string | undefined> = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  if (page > 1) query.set('page', String(page));
  const search = query.toString();
  return search ? `${basePath}?${search}` : basePath;
}
