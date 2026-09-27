import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStandings } from './ranking.ts';
import type { MatchDay, MatchType } from './types.ts';

const match = (type: MatchType, scores: Record<string, number>) => ({
  type,
  rows: Object.entries(scores).map(([playerId, score]) => ({ playerId, score })),
});
const day = (date: string, ...matches: ReturnType<typeof match>[]): MatchDay => ({ id: date, date, status: 'published', matches });

const byPlayer = (days: MatchDay[]) => Object.fromEntries(computeStandings(days).map((row) => [row.playerId, row]));

test('every Card and Snooker match counts towards the total', () => {
  const rows = byPlayer([day('2026-01-04', match('card', { a: 3, b: 1 }), match('snooker', { a: 2, c: 1 }))]);
  assert.equal(rows.a.total, 2);
  assert.equal(rows.b.total, 1);
  assert.equal(rows.c.total, 1);
});

test('a sole winner gets a win and a crown', () => {
  const rows = byPlayer([day('2026-01-04', match('card', { a: 3, b: 1 }))]);
  assert.deepEqual([rows.a.wins, rows.a.crowns], [1, 1]);
  assert.deepEqual([rows.b.wins, rows.b.crowns], [0, 0]);
});

test('sharing the top score is a win but not a crown', () => {
  const rows = byPlayer([day('2026-01-04', match('card', { a: 3, b: 3, c: 1 }))]);
  assert.deepEqual([rows.a.wins, rows.a.crowns], [1, 0]);
  assert.deepEqual([rows.b.wins, rows.b.crowns], [1, 0]);
  assert.equal(rows.c.wins, 0);
});

test('nobody wins when everyone is on 0, and everyone gets an egg', () => {
  const rows = byPlayer([day('2026-01-04', match('card', { a: 0, b: 0 }))]);
  assert.deepEqual([rows.a.wins, rows.a.eggs], [0, 1]);
  assert.deepEqual([rows.b.wins, rows.b.eggs], [0, 1]);
});

test('0 points gets an egg', () => {
  const rows = byPlayer([day('2026-01-04', match('card', { a: 2, b: 0, c: 0 }))]);
  assert.equal(rows.a.eggs, 0);
  assert.equal(rows.b.eggs, 1);
  assert.equal(rows.c.eggs, 1);
});

test('win rate is a whole-number percentage of matches won', () => {
  const rows = byPlayer([
    day('2026-01-04', match('card', { a: 3, b: 1 }), match('snooker', { a: 1, b: 2 })),
    day('2026-01-11', match('card', { a: 1, b: 2 })),
  ]);
  assert.equal(rows.a.winRate, 33);
  assert.equal(rows.b.winRate, 67);
});

test('most wins first, equal wins share a dense rank', () => {
  const standings = computeStandings([
    day('2026-01-04', match('card', { a: 3, b: 1, c: 0 }), match('snooker', { a: 2, b: 1 })),
    day('2026-01-11', match('card', { b: 3, c: 1, d: 0 }), match('snooker', { c: 2, d: 1 })),
  ]);
  assert.deepEqual(
    standings.map((row) => [row.playerId, row.wins, row.rank]),
    [
      ['a', 2, 1],
      ['b', 1, 2],
      ['c', 1, 2],
      ['d', 0, 3],
    ],
  );
});

test('within equal wins, the better win rate is listed first', () => {
  const standings = computeStandings([
    day('2026-01-04', match('card', { a: 3, b: 1 }), match('snooker', { a: 0, b: 2 })),
    day('2026-01-11', match('card', { a: 1, c: 2 })),
  ]);
  // b: 1 of 2, c: 1 of 1, a: 1 of 3
  assert.deepEqual(standings.map((row) => row.playerId), ['c', 'b', 'a']);
  assert.ok(standings.every((row) => row.rank === 1));
});

test('players who never played are left out', () => {
  assert.deepEqual(computeStandings([]), []);
});
