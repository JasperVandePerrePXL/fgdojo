import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlayerProfiles } from '../src/stats/player_profiles.js';
import { computeRatings } from '../src/stats/elo.js';

const player = (id, gamerTag, prefix = '') => ({ id, gamerTag, prefix, player: { id, gamerTag } });
const slot = (id, score) => ({
  entrant: { id: `e${id}`, participants: [{ id, player: { id } }] },
  standing: { stats: { score: { value: score } } },
});

/** One game event; `players` are [participant, placement]; `sets` are [winnerId, score, loserId, score]. */
function event({ slug, startAt, gameId = 1, gameName = 'SF6', players, sets = [] }) {
  return {
    name: `1v1 ${gameName}`,
    tournament: { slug: `tournament/${slug}`, name: `Dojo ${slug}`, startAt },
    videogame: { id: gameId, name: gameName },
    entrants: {
      pageInfo: { total: players.length },
      nodes: players.map(([p, placement]) => ({ participants: [p], standing: { placement } })),
    },
    sets: { nodes: sets.map(([a, sa, b, sb]) => ({ slots: [slot(a, sa), slot(b, sb)] })) },
  };
}

const JAN = Date.UTC(2026, 0, 10, 12) / 1000;
const FEB = Date.UTC(2026, 1, 14, 12) / 1000;
const alice = player(1, 'Alice');
const bob = player(2, 'Bob');
const cara = player(3, 'Cara', 'LCG');
const biscuit = player(99, 'Biscuit', 'HM!'); // hidden in data/hidden_players.json

const events = [
  event({
    slug: 'feb',
    startAt: FEB,
    players: [
      [alice, 2],
      [bob, 1],
    ],
    sets: [[2, 2, 1, 1]],
  }),
  event({
    slug: 'jan',
    startAt: JAN,
    players: [
      [alice, 1],
      [bob, 2],
      [cara, 3],
      [biscuit, 4],
    ],
    sets: [
      [1, 2, 2, 0],
      [1, 2, 3, 1],
      [1, 2, 99, 0],
    ],
  }),
  event({ slug: 'jan', startAt: JAN, gameId: 2, gameName: 'T8', players: [[alice, 1]] }),
];

const { historyByGame } = computeRatings([{ seasonId: 1, events }]);
const { players } = buildPlayerProfiles(events, historyByGame);

test('player profiles list results oldest first, per game, most played game first', () => {
  const profile = players['1'];
  assert.equal(profile.displayName, 'Alice');
  assert.deepEqual(
    profile.games.map((game) => game.gameName),
    ['SF6', 'T8'],
  );
  const sf6 = profile.games[0];
  assert.deepEqual(
    sf6.results.map(({ date, placement, entrants }) => [date, placement, entrants]),
    [
      ['2026-01-10', 1, 4],
      ['2026-02-14', 2, 2],
    ],
  );
  assert.equal(players['3'].displayName, 'LCG | Cara');
});

test('player profiles carry the Elo history and current rating of each game', () => {
  const sf6 = players['1'].games[0];
  assert.deepEqual(
    sf6.history.map((point) => point.tournament),
    ['Dojo jan', 'Dojo feb'],
  );
  assert.equal(sf6.rating, sf6.history.at(-1).rating);
  const t8 = players['1'].games[1];
  assert.deepEqual(t8.history, []); // entered, but no rated set
  assert.equal(t8.rating, null);
});

test('head-to-head records count rated sets per opponent, most played first', () => {
  assert.deepEqual(players['1'].games[0].headToHead, [
    { opponentId: '2', opponentName: 'Bob', wins: 1, losses: 1 },
    { opponentId: '3', opponentName: 'LCG | Cara', wins: 1, losses: 0 },
  ]);
  assert.deepEqual(players['2'].games[0].headToHead, [
    { opponentId: '1', opponentName: 'Alice', wins: 1, losses: 1 },
  ]);
});

test('hidden players get no page and are in no head-to-head record', () => {
  assert.equal(players['99'], undefined);
  const opponents = Object.values(players).flatMap((p) => p.games.flatMap((g) => g.headToHead));
  assert.ok(opponents.every((record) => record.opponentId !== '99'));
});
