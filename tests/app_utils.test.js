import test from 'node:test';
import assert from 'node:assert/strict';
import { formatScore, rateClass } from '../app/utils/format.js';
import { dojoKeyOf } from '../shared/rules.js';

test('rateClass groups win rates', () => {
  assert.equal(rateClass(75), 'high');
  assert.equal(rateClass(60), 'high');
  assert.equal(rateClass(50), 'medium');
  assert.equal(rateClass(44.9), 'low');
});

test('formatScore uses one decimal and leaves non-numbers alone', () => {
  assert.equal(formatScore(43.456), '43.5');
  assert.equal(formatScore(undefined), undefined);
});

test('dojoKeyOf prefers the tournament slug', () => {
  assert.equal(dojoKeyOf({ dojoId: 'slug', date: '2026-01-01', name: 'x' }), 'slug');
  assert.equal(dojoKeyOf({ dojoId: null, date: '2026-01-01', name: 'x' }), '2026-01-01|x');
});
