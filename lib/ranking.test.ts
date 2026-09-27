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

test('total is every score in the matches played, win is the player’s own score', () => {
  const rows = byPlayer([day('2026-01-04', match('card', { a: 3, b: 2, c: 0 }), match('snooker', { a: 1, c: 4 }))]);
  assert.deepEqual([rows.a.total, rows.a.wins], [10, 4]);
  assert.deepEqual([rows.c.total, rows.c.wins], [10, 4]);
});

test('a match the player did not play adds nothing', () => {
  const rows = byPlayer([day('2026-01-04', match('card', { a: 3, b: 2 }), match('snooker', { a: 1, c: 4 }))]);
  assert.deepEqual([rows.b.total, rows.b.wins], [5, 2]);
});

test('totals add up across days and match types', () => {
  const rows = byPlayer([
    day('2026-01-04', match('card', { a: 3, b: 1 })),
    day('2026-01-11', match('snooker', { a: 2, b: 2 })),
  ]);
  assert.deepEqual([rows.a.total, rows.a.wins], [8, 5]);
  assert.deepEqual([rows.b.total, rows.b.wins], [8, 3]);
});

test('win rate is a whole-number percentage of games won', () => {
  const rows = byPlayer([day('2026-01-04', match('card', { a: 2, b: 1 }))]);
  assert.equal(rows.a.winRate, 67);
  assert.equal(rows.b.winRate, 33);
});

test('a sole winner gets a crown, sharing the top score does not', () => {
  const rows = byPlayer([day('2026-01-04', match('card', { a: 3, b: 1 }), match('snooker', { a: 2, b: 2, c: 1 }))]);
  assert.equal(rows.a.crowns, 1);
  assert.equal(rows.b.crowns, 0);
});

test('0 points gets an egg', () => {
  const rows = byPlayer([day('2026-01-04', match('card', { a: 2, b: 0, c: 0 }))]);
  assert.deepEqual([rows.a.eggs, rows.b.eggs, rows.c.eggs], [0, 1, 1]);
});

test('a match where nobody scored still lists the players, at 0%', () => {
  const rows = byPlayer([day('2026-01-04', match('card', { a: 0, b: 0 }))]);
  assert.deepEqual([rows.a.total, rows.a.wins, rows.a.winRate, rows.a.eggs], [0, 0, 0, 1]);
  assert.ok(rows.b);
});

test('most wins first, equal wins share a dense rank', () => {
  const standings = computeStandings([day('2026-01-04', match('card', { a: 5, b: 3, c: 3, d: 0 }))]);
  assert.deepEqual(
    standings.map((row) => [row.playerId, row.wins, row.rank]),
    [
      ['a', 5, 1],
      ['b', 3, 2],
      ['c', 3, 2],
      ['d', 0, 3],
    ],
  );
});

test('within equal wins, the better win rate is listed first', () => {
  const standings = computeStandings([
    day('2026-01-04', match('card', { a: 2, b: 6 })),
    day('2026-01-11', match('card', { c: 2, d: 1 })),
  ]);
  // c: 2 of 3 games, a: 2 of 8
  assert.deepEqual(
    standings.map((row) => [row.playerId, row.rank]),
    [
      ['b', 1],
      ['c', 2],
      ['a', 2],
      ['d', 3],
    ],
  );
});

test('players who never played are left out', () => {
  assert.deepEqual(computeStandings([]), []);
});
