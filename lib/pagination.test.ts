import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MANAGE_PAGE_SIZE, clampPage, pageCount, pageHref, pageWindow, parsePage } from './pagination.ts';

test('page count uses a fixed 5 days per page', () => {
  assert.equal(pageCount(0), 1);
  assert.equal(pageCount(5), 1);
  assert.equal(pageCount(7), 2);
  assert.equal(pageCount(11), 3);
});

test('query-string pages fall back to page 1 when invalid', () => {
  assert.equal(parsePage('2'), 2);
  assert.equal(parsePage(undefined), 1);
  assert.equal(parsePage('abc'), 1);
  assert.equal(parsePage('0'), 1);
  assert.equal(parsePage('1.5'), 1);
});

test('pages are clamped to the available range', () => {
  assert.equal(clampPage(9, 7), 2);
  assert.equal(clampPage(0, 7), 1);
  assert.equal(clampPage(1, 0), 1);
});

test('page window shows every page when there are few', () => {
  assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
});

test('page window keeps first, last and neighbours with gaps', () => {
  assert.deepEqual(pageWindow(5, 12), [1, 'gap', 4, 5, 6, 'gap', 12]);
  assert.deepEqual(pageWindow(1, 12), [1, 2, 'gap', 12]);
  assert.deepEqual(pageWindow(12, 12), [1, 'gap', 11, 12]);
});

test('page links keep other params and drop page 1', () => {
  assert.equal(pageHref('/manage', 1), '/manage');
  assert.equal(pageHref('/manage', 3), '/manage?page=3');
  assert.equal(pageHref('/history', 2, { from: '2026-09-11' }), '/history?from=2026-09-11&page=2');
  assert.equal(pageHref('/history', 1, { from: undefined }), '/history');
});

test('the admin list pages 10 days at a time', () => {
  assert.equal(pageCount(10, MANAGE_PAGE_SIZE), 1);
  assert.equal(pageCount(11, MANAGE_PAGE_SIZE), 2);
  assert.equal(clampPage(5, 11, MANAGE_PAGE_SIZE), 2);
});
