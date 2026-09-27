import { computeResult } from './results.ts';
import type { MatchDay } from './types';

export interface Standing {
  playerId: string;
  rank: number;
  /** Matches played (each Card or Snooker match counts once). */
  total: number;
  /** Sole winner, or tied for the top non-zero score. */
  wins: number;
  /** Whole-number percentage of matches won. */
  winRate: number;
  /** Sole winner only. */
  crowns: number;
  /** On 0 points. */
  eggs: number;
}

/** All-time league table over the given days: most wins first, equal wins share a (dense) rank. */
export function computeStandings(days: readonly MatchDay[]): Standing[] {
  const tally = new Map<string, Omit<Standing, 'rank' | 'winRate'>>();

  for (const day of days) {
    for (const match of day.matches) {
      const result = computeResult(match.rows);
      for (const { playerId } of match.rows) {
        const row = tally.get(playerId) ?? { playerId, total: 0, wins: 0, crowns: 0, eggs: 0 };
        row.total += 1;
        if (playerId === result.winnerId) row.crowns += 1;
        if (playerId === result.winnerId || result.tiedTopIds.includes(playerId)) row.wins += 1;
        if (result.loserIds.includes(playerId)) row.eggs += 1;
        tally.set(playerId, row);
      }
    }
  }

  // Within equal wins, better win rate then more crowns come first — display order only, the rank is shared.
  const sorted = [...tally.values()]
    .map((row) => ({ ...row, winRate: Math.round((row.wins / row.total) * 100) }))
    .sort((a, b) => b.wins - a.wins || b.wins / b.total - a.wins / a.total || b.crowns - a.crowns);

  let rank = 0;
  let previous: number | undefined;
  return sorted.map((row) => {
    if (row.wins !== previous) {
      rank += 1;
      previous = row.wins;
    }
    return { ...row, rank };
  });
}
