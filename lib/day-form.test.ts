import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDayPayload, type DayPayload } from './day-form.ts';

const valid: DayPayload = {
  date: '2026-09-20',
  status: 'draft',
  matches: [{ type: 'card', rows: [{ playerId: 'a', score: 3 }, { playerId: 'b', score: 0 }] }],
};

test('a complete day is valid', () => {
  assert.deepEqual(validateDayPayload(valid), []);
});

test('a day needs at least one match', () => {
  assert.equal(validateDayPayload({ ...valid, matches: [] }).length, 1);
});

test('matches need 2+ distinct players with whole, non-negative scores', () => {
  const errors = validateDayPayload({
    ...valid,
    matches: [{ type: 'snooker', rows: [{ playerId: 'a', score: 1.5 }, { playerId: 'a', score: -1 }, { playerId: '', score: 2 }] }],
  });
  assert.deepEqual(errors, [
    'Snooker: choose a player for every row.',
    'Snooker: a player is listed more than once.',
    'Snooker: scores must be whole numbers, 0 or more.',
  ]);
});
