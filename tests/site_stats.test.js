import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSiteStats, readSet } from '../src/stats/site_stats.js';

const player = (id, gamerTag, prefix = '') => ({ id, gamerTag, prefix, player: { id, gamerTag } });
const slot = (id, score) => ({
  entrant: { id: `e${id}`, participants: [{ id, player: { id } }] },
  standing: { stats: { score: { value: score } } },
});

function event({ slug, startAt, game, players, sets = [] }) {
  return {
    tournament: { slug, name: slug, startAt },
    videogame: { name: game },
    entrants: { nodes: players.map((p) => ({ participants: [p] })) },
    sets: { nodes: sets.map(([a, sa, b, sb]) => ({ slots: [slot(a, sa), slot(b, sb)] })) },
  };
}

const JAN = Date.UTC(2026, 0, 10) / 1000;
const FEB = Date.UTC(2026, 1, 10) / 1000;
const alice = player(1, 'Alice');
const bob = player(2, 'Bob');
const cara = player(3, 'Cara');
const biscuit = player(99, 'Biscuit', 'HM!'); // hidden in data/hidden_players.json

const stats = buildSiteStats([
  {
    seasonId: 1,
    seasonName: 'Season 1',
    events: [
      event({ slug: 'feb', startAt: FEB, game: 'SF6', players: [alice, cara], sets: [[1, 2, 3, 0]] }),
      event({
        slug: 'jan',
        startAt: JAN,
        game: 'SF6',
        players: [alice, bob, biscuit],
        sets: [
          [1, 2, 2, 1],
          [1, 2, 99, 0],
        ],
      }),
      event({ slug: 'jan', startAt: JAN, game: 'T8', players: [alice, bob], sets: [[2, 2, 1, 0]] }),
    ],
  },
]);

test('dojos are counted once, oldest first, with new and returning players', () => {
  assert.deepEqual(
    stats.dojos.map(({ dojoId, players, newPlayers, returningPlayers }) => ({
      dojoId,
      players,
      newPlayers,
      returningPlayers,
    })),
    [
      { dojoId: 'jan', players: 2, newPlayers: 2, returningPlayers: 0 },
      { dojoId: 'feb', players: 2, newPlayers: 1, returningPlayers: 1 },
    ],
  );
  assert.deepEqual(stats.dojos[0].entrantsByGame, { SF6: 2, T8: 2 });
});

test('hidden players and their sets are left out', () => {
  assert.equal(stats.totals.players, 3);
  assert.equal(stats.totals.sets, 3);
  assert.equal(
    stats.rivalries.some((r) => r.playerA.includes('Biscuit') || r.playerB.includes('Biscuit')),
    false,
  );
});

test('season comparison and game totals', () => {
  assert.deepEqual(stats.seasons[0], {
    seasonId: 1,
    seasonName: 'Season 1',
    sets: 3,
    games: 7,
    dojos: 2,
    uniquePlayers: 3,
    averageAttendance: 2,
    entrants: 6,
  });
  assert.deepEqual(stats.games, [
    { gameName: 'SF6', entrants: 4 },
    { gameName: 'T8', entrants: 2 },
  ]);
});

test('rivalries are sorted by sets played', () => {
  assert.deepEqual(stats.rivalries[0], { playerA: 'Alice', playerB: 'Bob', winsA: 1, winsB: 1, sets: 2 });
});

test('readSet skips DQs and decides ties by winnerId', () => {
  assert.equal(readSet({ slots: [slot(1, -1), slot(2, 0)] }), null);
  assert.equal(readSet({ slots: [slot(1, 0), slot(2, 0)], winnerId: 'e2' }).p1Won, false);
  assert.equal(readSet({ slots: [slot(1, 0), slot(2, 0)] }), null);
});
