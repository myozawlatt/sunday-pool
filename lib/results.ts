import type { ScoreRow } from './types';

/**
 * winner   – exactly one highest scorer with more than 0 points (gets the crown)
 * draw     – no single winner, but there are 0-point losers
 * draw-all – no winner and no losers
 */
export type Outcome = 'winner' | 'draw' | 'draw-all';

export interface RankedRow extends ScoreRow {
  rank: number;
}

export interface MatchResult {
  ranked: RankedRow[];
  winnerId: string | null;
  /** Everyone on 0 points — each gets the fried egg. */
  loserIds: string[];
  /** Players sharing the top (non-zero) score when there is no single winner. */
  tiedTopIds: string[];
  outcome: Outcome;
}

/** Result rules for a single match (Card or Snooker). */
export function computeResult(rows: readonly ScoreRow[]): MatchResult {
  const sorted = [...rows].sort((a, b) => b.score - a.score);

  // Dense ranking: equal scores share a rank, the next score takes the next number (1, 1, 2, 3, 4, 4).
  let rank = 0;
  let previous: number | undefined;
  const ranked = sorted.map((row) => {
    if (row.score !== previous) {
      rank += 1;
      previous = row.score;
    }
    return { ...row, rank };
  });

  const topScore = ranked.length > 0 ? ranked[0].score : 0;
  const topRows = ranked.filter((row) => row.score === topScore);
  const winnerId = topRows.length === 1 && topScore > 0 ? topRows[0].playerId : null;
  const loserIds = ranked.filter((row) => row.score === 0).map((row) => row.playerId);
  const tiedTopIds = winnerId || topScore === 0 ? [] : topRows.map((row) => row.playerId);

  const outcome: Outcome = winnerId ? 'winner' : loserIds.length > 0 ? 'draw' : 'draw-all';

  return { ranked, winnerId, loserIds, tiedTopIds, outcome };
}
