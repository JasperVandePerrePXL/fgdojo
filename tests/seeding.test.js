import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeeding, seedingToCsv } from '../src/stats/seeding.js';

const entrant = (id, gamerTag, prefix = '') => ({
  name: prefix ? `${prefix} | ${gamerTag}` : gamerTag,
  participants: [{ id: id + 1000, gamerTag, prefix, player: { id } }],
});

const events = [
  {
    name: '1v1 SF6',
    videogame: { id: 1, name: 'SF6' },
    entrants: {
      nodes: [
        entrant(10, 'Newbie'),
        entrant(11, 'Alice'),
        entrant(12, 'Bob', 'LCG'),
        entrant(13, 'Cara'),
        entrant(2353012, 'LikeHere'), // merged into 1287124 by data/player_aliases.json
      ],
    },
  },
  { name: '1v1 T8', videogame: { id: 2, name: 'T8' }, entrants: { nodes: [entrant(11, 'Alice')] } },
];
const ratings = new Map([
  [
    '1',
    new Map([
      ['11', 1600],
      ['12', 1700],
      ['13', 1600],
      ['1287124', 1550],
    ]),
  ],
]);

test('buildSeeding sorts each game by rating, ties by name, unrated players last in sign-up order', () => {
  const [sf6, t8] = buildSeeding(events, ratings);
  assert.equal(sf6.gameName, 'SF6');
  assert.deepEqual(
    sf6.players.map(({ seed, name, rating }) => [seed, name, rating]),
    [
      [1, 'LCG | Bob', 1700],
      [2, 'Alice', 1600],
      [3, 'Cara', 1600],
      [4, 'LikeHere', 1550],
      [5, 'Newbie', null],
    ],
  );
  assert.equal(sf6.players[3].playerId, '1287124'); // merged account uses the main account's rating
  assert.deepEqual(
    t8.players.map(({ name, rating }) => [name, rating]),
    [['Alice', null]],
  ); // no T8 ratings at all
});

test('seedingToCsv writes one row per player and quotes awkward names', () => {
  const csv = seedingToCsv([
    { gameName: 'SF6', players: [{ seed: 1, name: 'A, "B"', rating: 1600, playerId: '7' }] },
    { gameName: 'T8', players: [{ seed: 1, name: 'C', rating: null, playerId: null }] },
  ]);
  assert.equal(csv, 'Game,Seed,Player,Rating,start.gg player ID\nSF6,1,"A, ""B""",1600,7\nT8,1,C,,\n');
});
