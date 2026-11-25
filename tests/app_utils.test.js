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

import { niceScale, seriesColor, shortDate } from '../app/utils/chart.js';

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
