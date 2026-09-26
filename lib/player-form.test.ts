import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUOTE_MAX, readHandle, readQuote } from './player-form.ts';

test('handles are trimmed and lower-cased', () => {
  assert.equal(readHandle('  Alex-Tan '), 'alex-tan');
  assert.equal(readHandle('a'), 'a');
  assert.equal(readHandle('x'.repeat(30)), 'x'.repeat(30));
});

test('invalid handles are rejected', () => {
  for (const bad of ['', '-alex', 'alex-', 'alex tan', 'alex_tan', 'x'.repeat(31), 'မောင်', null, undefined]) {
    assert.equal(readHandle(bad), null, String(bad));
  }
});

test('an empty or blank quote is no quote', () => {
  assert.equal(readQuote(''), null);
  assert.equal(readQuote('   \n '), null);
  assert.equal(readQuote(null), null);
});

test('Burmese quotes are kept, trimmed and NFC-normalised', () => {
  assert.equal(readQuote('  ကြိုးစားရင် အောင်မြင်မယ်။ '), 'ကြိုးစားရင် အောင်မြင်မယ်။');
  assert.equal(readQuote('é'), 'é');
});

test('quotes are limited by characters, not bytes', () => {
  assert.equal(readQuote('က'.repeat(QUOTE_MAX)), 'က'.repeat(QUOTE_MAX));
  assert.equal(readQuote('က'.repeat(QUOTE_MAX + 1)), undefined);
});
