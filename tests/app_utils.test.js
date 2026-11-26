import test from 'node:test';
import assert from 'node:assert/strict';
import { rateClass } from '../app/utils/format.js';
import { dojoKeyOf } from '../shared/rules.js';

test('rateClass groups win rates', () => {
  assert.equal(rateClass(75), 'high');
  assert.equal(rateClass(60), 'high');
  assert.equal(rateClass(50), 'medium');
  assert.equal(rateClass(44.9), 'low');
});

test('dojoKeyOf prefers the tournament slug', () => {
  assert.equal(dojoKeyOf({ dojoId: 'slug', date: '2026-01-01', name: 'x' }), 'slug');
  assert.equal(dojoKeyOf({ dojoId: null, date: '2026-01-01', name: 'x' }), '2026-01-01|x');
});

import { niceRange, niceScale, seriesColor, shortDate } from '../app/utils/chart.js';

test('chart helpers', () => {
  assert.deepEqual(niceScale(46), { max: 50, ticks: [0, 10, 20, 30, 40, 50] });
  assert.deepEqual(niceScale(20), { max: 20, ticks: [0, 5, 10, 15, 20] });
  assert.deepEqual(niceScale(0), { max: 1, ticks: [0, 1] });
  assert.equal(shortDate('2025-03-09'), "Mar '25");
  assert.equal(shortDate(null), '');
  assert.equal(seriesColor(0), 'var(--series-1)');
  assert.equal(seriesColor(9), 'var(--muted)');
});

import { ALL_TIME, buildDateRanges } from '../app/utils/ranges.js';
import { paginate } from '../app/utils/pagination.js';

test('date ranges: all time, then each year with the halves that have dojos', () => {
  const ranges = buildDateRanges(['2025-03-01', '2025-09-01', '2026-02-01', null]);
  assert.deepEqual(
    ranges.map((range) => range.label),
    ['All time', '2025', 'H1 2025', 'H2 2025', '2026', 'H1 2026'],
  );
  const h2 = ranges.find((range) => range.id === '2025-H2');
  assert.equal(h2.contains('2025-07-01'), true);
  assert.equal(h2.contains('2025-06-30'), false);
  assert.equal(h2.contains(null), false);
  assert.equal(ranges.find((range) => range.id === ALL_TIME).contains(null), true);
});

test('paginate clamps the page and reports the row numbers', () => {
  const rows = Array.from({ length: 23 }, (_, i) => i);
  assert.deepEqual(paginate(rows, 3, 10), {
    rows: [20, 21, 22],
    page: 3,
    pageCount: 3,
    first: 21,
    last: 23,
    total: 23,
  });
  assert.equal(paginate(rows, 99, 10).page, 3);
  assert.deepEqual(paginate([], 1, 10), { rows: [], page: 1, pageCount: 1, first: 0, last: 0, total: 0 });
});

import { ALL_SEASONS_ID, pickSeason } from '../app/utils/selection.js';

test('pickSeason keeps a valid remembered season and otherwise picks the latest', () => {
  assert.equal(pickSeason([0, 1], '0'), '0');
  assert.equal(pickSeason([0, 1], null), '1'); // first visit: Number(null) is 0, must not pick season 0
  assert.equal(pickSeason([0, 1], 'null'), '1');
  assert.equal(pickSeason([0, 1], ''), '1');
  assert.equal(pickSeason([0, 1], '7'), '1');
  assert.equal(pickSeason([], null), '');
  assert.equal(pickSeason([0, 1], ALL_SEASONS_ID), ALL_SEASONS_ID);
  assert.equal(pickSeason([], ALL_SEASONS_ID), '');
});

test('niceRange fits values far from zero and falls back to niceScale from 0', () => {
  assert.deepEqual(niceRange(1432, 1618), {
    min: 1400,
    max: 1650,
    ticks: [1400, 1450, 1500, 1550, 1600, 1650],
  });
  assert.deepEqual(niceRange(1500, 1500), {
    min: 1496,
    max: 1504,
    ticks: [1496, 1498, 1500, 1502, 1504],
  });
  assert.deepEqual(niceRange(0, 46), { min: 0, max: 50, ticks: [0, 10, 20, 30, 40, 50] });
});

import { ordinal, playerUrl, readQuery, updateQuery } from '../app/utils/url.js';

test('query helpers read, update and remove parameters', () => {
  assert.deepEqual(readQuery('?season=1&game=43868'), { season: '1', game: '43868' });
  assert.equal(updateQuery('?season=1&game=2', { game: '3' }), '?season=1&game=3');
  assert.equal(updateQuery('?season=1', { season: null }), '');
  assert.equal(updateQuery('', { season: 'all', game: 7 }), '?season=all&game=7');
  assert.equal(playerUrl('3762539', '43868'), '/player.html?id=3762539&game=43868');
  assert.equal(playerUrl('5'), '/player.html?id=5');
});

test('ordinal placements', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal), [
    '1st',
    '2nd',
    '3rd',
    '4th',
    '11th',
    '12th',
    '13th',
    '21st',
    '22nd',
    '23rd',
    '101st',
  ]);
});
