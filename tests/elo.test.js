import test from 'node:test';
import assert from 'node:assert/strict';
import {
  START_RATING,
  bracketFactor,
  computeRatings,
  expectedScore,
  marginFactor,
} from '../src/stats/elo.js';

const player = (id, gamerTag, prefix = '') => ({ id, gamerTag, prefix, player: { id, gamerTag } });
const slot = (id, score) => ({
  entrant: { id: `e${id}`, participants: [{ id, player: { id } }] },
  standing: { stats: { score: { value: score } } },
});

/** One event; `sets` are [winnerId, winnerScore, loserId, loserScore]. `size` pads the entrant list. */
function event({ startAt = 1, gameId = 1, players, sets, size = 16 }) {
  const padding = Array.from({ length: Math.max(0, size - players.length) }, (_, i) =>
    player(1000 + i, `pad${i}`),
  );
  return {
    tournament: { startAt },
    videogame: { id: gameId },
    entrants: { nodes: [...players, ...padding].map((p) => ({ participants: [p] })) },
    sets: { nodes: sets.map(([a, sa, b, sb]) => ({ slots: [slot(a, sa), slot(b, sb)] })) },
  };
}

const alice = player(1, 'Alice');
const bob = player(2, 'Bob');
const cara = player(3, 'Cara');

test('expected score, bracket factor and margin factor', () => {
  assert.equal(expectedScore(1500, 1500), 0.5);
  assert.ok(expectedScore(1700, 1500) > 0.75);
  assert.equal(bracketFactor(16), 1);
  assert.equal(bracketFactor(4), 0.5);
  assert.equal(bracketFactor(32), 1.25);
  assert.equal(bracketFactor(1000), 1.5);
  assert.equal(marginFactor(2, 1), 1);
  assert.equal(marginFactor(3, 2), 1);
  assert.equal(marginFactor(2, 0), 1.1);
  assert.equal(marginFactor(3, 0), 1.2);
  assert.equal(marginFactor(0, 0), 1);
});

test('a first win between new players moves both by the provisional K', () => {
  const { final } = computeRatings([
    { seasonId: 0, events: [event({ players: [alice, bob], sets: [[1, 2, 2, 1]] })] },
  ]);
  assert.equal(final.overall.get('1'), START_RATING + 32); // 64 × 1 × 1 × 0.5
  assert.equal(final.overall.get('2'), START_RATING - 32);
  assert.equal(final.byGame.get('1').get('1'), START_RATING + 32);
});

test('bigger brackets and clean wins move ratings more', () => {
  const rate = (size, score) =>
    computeRatings([
      { seasonId: 0, events: [event({ players: [alice, bob], sets: [[1, score, 2, 0]], size })] },
    ]).final.overall.get('1');
  assert.ok(rate(32, 2) > rate(16, 2));
  assert.ok(rate(16, 3) > rate(16, 1));
});

test('ratings carry over between seasons and are snapshotted per season', () => {
  const { bySeason, final } = computeRatings([
    { seasonId: 0, events: [event({ startAt: 1, players: [alice, bob], sets: [[1, 2, 2, 1]] })] },
    { seasonId: 1, events: [event({ startAt: 2, players: [alice, cara], sets: [[3, 2, 1, 1]] })] },
  ]);
  assert.equal(bySeason.get(0).overall.get('1'), START_RATING + 32);
  assert.equal(bySeason.get(0).overall.has('3'), false);
  assert.ok(bySeason.get(1).overall.get('1') < START_RATING + 32);
  assert.deepEqual(final.overall, bySeason.get(1).overall);
});

test('games have separate ratings; hidden players and DQs are skipped', () => {
  const biscuit = player(99, 'Biscuit', 'HM!'); // hidden in data/hidden_players.json
  const { final } = computeRatings([
    {
      seasonId: 0,
      events: [
        event({ gameId: 1, players: [alice, bob], sets: [[1, 2, 2, 0]] }),
        event({
          gameId: 2,
          players: [alice, biscuit, bob],
          sets: [
            [99, 2, 1, 0],
            [2, 0, 1, -1],
          ],
        }),
      ],
    },
  ]);
  assert.equal(final.byGame.get('2').size, 0);
  assert.ok(final.byGame.get('1').get('1') > START_RATING);
  assert.equal(final.overall.has('99'), false);
});
