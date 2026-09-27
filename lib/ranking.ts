import { computeResult } from './results.ts';
import type { MatchDay } from './types';

export interface Standing {
  playerId: string;
  rank: number;
  /** Games played: every player's score summed, over the matches this player took part in. */
  total: number;
  /** Games won: the player's own score summed. */
  wins: number;
  /** Whole-number percentage of games won. */
  winRate: number;
  /** Matches won outright (sole top scorer). */
  crowns: number;
  /** Matches finished on 0 points. */
  eggs: number;
}

const rate = (row: { wins: number; total: number }) => (row.total > 0 ? row.wins / row.total : 0);

/** All-time league table over the given days: most wins first, equal wins share a (dense) rank. */
export function computeStandings(days: readonly MatchDay[]): Standing[] {
  const tally = new Map<string, Omit<Standing, 'rank' | 'winRate'>>();

  for (const day of days) {
    for (const match of day.matches) {
      const result = computeResult(match.rows);
      const games = match.rows.reduce((sum, row) => sum + row.score, 0);
      for (const { playerId, score } of match.rows) {
        const row = tally.get(playerId) ?? { playerId, total: 0, wins: 0, crowns: 0, eggs: 0 };
        row.total += games;
        row.wins += score;
        if (playerId === result.winnerId) row.crowns += 1;
        if (result.loserIds.includes(playerId)) row.eggs += 1;
        tally.set(playerId, row);
      }
    }
  }

  // Within equal wins, better win rate then more crowns come first — display order only, the rank is shared.
  const sorted = [...tally.values()]
    .sort((a, b) => b.wins - a.wins || rate(b) - rate(a) || b.crowns - a.crowns)
    .map((row) => ({ ...row, winRate: Math.round(rate(row) * 100) }));

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
