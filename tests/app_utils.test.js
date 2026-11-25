import test from 'node:test';
import assert from 'node:assert/strict';
import { dojoKeyOf, formatScore, rateClass, topPlayers } from '../app/utils/format.js';

test('rateClass groups win rates', () => {
  assert.equal(rateClass(75), 'high');
  assert.equal(rateClass(60), 'high');
  assert.equal(rateClass(50), 'medium');
  assert.equal(rateClass(44.9), 'low');
});

test('topPlayers sorts descending, filters and limits', () => {
  const players = [
    { name: 'a', wins: 1, games: 20 },
    { name: 'b', wins: 5, games: 3 },
    { name: 'c', wins: 3, games: 40 },
    { name: 'd', wins: 2, games: 12 },
  ];
  assert.deepEqual(topPlayers(players, (p) => p.wins).map((p) => p.name), ['b', 'c', 'd']);
  assert.deepEqual(topPlayers(players, (p) => p.wins, (p) => p.games >= 10).map((p) => p.name), ['c', 'd', 'a']);
  assert.deepEqual(topPlayers(players, (p) => p.wins, () => true, 1).map((p) => p.name), ['b']);
});

test('formatScore uses one decimal and leaves non-numbers alone', () => {
  assert.equal(formatScore(43.456), '43.5');
  assert.equal(formatScore(undefined), undefined);
});

test('dojoKeyOf prefers the tournament slug', () => {
  assert.equal(dojoKeyOf({ dojoId: 'slug', date: '2026-01-01', name: 'x' }), 'slug');
  assert.equal(dojoKeyOf({ dojoId: null, date: '2026-01-01', name: 'x' }), '2026-01-01|x');
});
