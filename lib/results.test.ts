import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeResult } from './results.ts';

const rows = (...scores: number[]) => scores.map((score, i) => ({ playerId: `p${i + 1}`, score }));

test('the single highest scorer is the winner', () => {
  const result = computeResult(rows(3, 7, 2));
  assert.equal(result.winnerId, 'p2');
  assert.equal(result.outcome, 'winner');
  assert.deepEqual(result.loserIds, []);
});

test('equal highest scorers mean no winner (draw)', () => {
  const result = computeResult(rows(5, 5, 0));
  assert.equal(result.winnerId, null);
  assert.equal(result.outcome, 'draw');
  assert.deepEqual(result.tiedTopIds, ['p1', 'p2']);
  assert.deepEqual(result.loserIds, ['p3']);
});

test('every 0 scorer is a loser', () => {
  const result = computeResult(rows(4, 0, 2, 0));
  assert.equal(result.winnerId, 'p1');
  assert.deepEqual(result.loserIds, ['p2', 'p4']);
});

test('no winner and no loser is a draw for all', () => {
  assert.equal(computeResult(rows(3, 3, 3)).outcome, 'draw-all');
  assert.equal(computeResult(rows(3, 3, 1)).outcome, 'draw-all');
});

test('everyone on 0 is a draw where all players are losers', () => {
  const result = computeResult(rows(0, 0, 0));
  assert.equal(result.winnerId, null);
  assert.equal(result.outcome, 'draw');
  assert.deepEqual(result.tiedTopIds, []);
  assert.deepEqual(result.loserIds, ['p1', 'p2', 'p3']);
});

test('a lone top scorer on 0 is a loser, not a winner', () => {
  const result = computeResult(rows(0));
  assert.equal(result.winnerId, null);
  assert.deepEqual(result.loserIds, ['p1']);
});

test('equal scores share dense ranks', () => {
  const result = computeResult(rows(5, 5, 3, 2, 0, 0));
  assert.deepEqual(result.ranked.map((row) => row.rank), [1, 1, 2, 3, 4, 4]);
});
