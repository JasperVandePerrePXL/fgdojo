import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBrusselsDate, getBrusselsYearMonth } from '../src/lib/dates.js';

test('dates use the Brussels time zone', () => {
  // 31 Dec 2026 23:30 UTC is already 1 Jan 2027 in Brussels (UTC+1).
  const timestamp = Math.floor(Date.UTC(2026, 11, 31, 23, 30) / 1000);
  assert.equal(formatBrusselsDate(timestamp), '2027-01-01');
  assert.deepEqual(getBrusselsYearMonth(timestamp), { year: 2027, month: 1 });
});

test('missing timestamps give no date', () => {
  assert.equal(formatBrusselsDate(null), null);
  assert.equal(formatBrusselsDate(undefined), null);
});
