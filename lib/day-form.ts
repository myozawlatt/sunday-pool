import { matchTitle, type DayStatus, type MatchType } from './types.ts';

/** What the admin day form sends to the save action (and on to the save_match_day RPC). */
export interface DayPayload {
  id?: string;
  date: string;
  status: DayStatus;
  matches: { type: MatchType; rows: { playerId: string; score: number }[] }[];
}

/** Returns human-readable problems; an empty list means the payload can be saved. */
export function validateDayPayload(payload: DayPayload): string[] {
  const errors: string[] = [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) errors.push('Pick a date.');
  if (payload.status !== 'draft' && payload.status !== 'published') errors.push('Unknown status.');
  if (payload.matches.length === 0) errors.push('Add at least one match — Card or Snooker.');

  for (const match of payload.matches) {
    const title = matchTitle(match.type);
    const ids = match.rows.map((row) => row.playerId).filter(Boolean);

    if (match.rows.length < 2) errors.push(`${title}: add at least 2 players.`);
    if (ids.length !== match.rows.length) errors.push(`${title}: choose a player for every row.`);
    if (new Set(ids).size !== ids.length) errors.push(`${title}: a player is listed more than once.`);
    if (match.rows.some((row) => !Number.isInteger(row.score) || row.score < 0)) {
      errors.push(`${title}: scores must be whole numbers, 0 or more.`);
    }
  }

  return errors;
}
