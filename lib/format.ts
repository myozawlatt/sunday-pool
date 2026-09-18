const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Dates are stored as YYYY-MM-DD; parse in UTC so the day never shifts with the viewer's timezone.
function toDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "14 Sep 2026" */
export function formatDate(iso: string) {
  const dt = toDate(iso);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

/** "Monday" */
export function weekday(iso: string) {
  return WEEKDAYS[toDate(iso).getUTCDay()];
}

export const pointsLabel = (n: number) => `${n} point${n === 1 ? '' : 's'}`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
