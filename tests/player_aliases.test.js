import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAliasMap, canonicalPlayerId } from '../src/config/player_aliases.js';
import { getPlayerId } from '../src/stats/names.js';
import { processLeaderboard } from '../src/stats/leaderboard.js';
import { computeRatings } from '../src/stats/elo.js';

test('buildAliasMap maps extra accounts to the main account and rejects duplicates', () => {
  const map = buildAliasMap({ players: [{ playerId: 1, otherIds: [2, '3'] }] });
  assert.deepEqual(
    [...map],
    [
      ['2', '1'],
      ['3', '1'],
    ],
  );
  assert.throws(() => buildAliasMap({ players: [{ playerId: 1, otherIds: [2] }, { playerId: 2 }] }), /2/);
});

// The real data/player_aliases.json merges 2353012 into 1287124 (LikeHere / LykeHere).
test('getPlayerId uses the main account for a merged account and leaves others alone', () => {
  assert.equal(canonicalPlayerId('2353012'), '1287124');
  assert.equal(getPlayerId({ id: 9, player: { id: 2353012 } }), 1287124);
  assert.equal(getPlayerId({ id: 9, player: { id: 42 } }), 42);
  assert.equal(getPlayerId(null), undefined);
});

const slot = (id, score) => ({
  entrant: { id: `e${id}`, participants: [{ id, player: { id } }] },
  standing: { stats: { score: { value: score } } },
});
function event({ slug, startAt, players, sets }) {
  return {
    name: '1v1 SF6',
    tournament: { slug, name: slug, startAt },
    videogame: { id: 1, name: 'SF6' },
    entrants: {
      pageInfo: { total: players.length },
      nodes: players.map(([id, tag]) => ({
        name: tag,
        participants: [{ id, gamerTag: tag, prefix: '', player: { id, gamerTag: tag } }],
        standing: { placement: 1 },
      })),
    },
    sets: { nodes: sets.map(([a, sa, b, sb]) => ({ slots: [slot(a, sa), slot(b, sb)] })) },
  };
}

test('a merged player counts as one player with the most recent name, in the ranking and the Elo rating', () => {
  const events = [
    event({
      slug: 'jan',
      startAt: 1,
      players: [
        [1287124, 'LykeHere'],
        [5, 'Bob'],
      ],
      sets: [[1287124, 2, 5, 0]],
    }),
    event({
      slug: 'feb',
      startAt: 2,
      players: [
        [2353012, 'LikeHere'],
        [5, 'Bob'],
      ],
      sets: [[2353012, 2, 5, 1]],
    }),
  ];
  const { players } = processLeaderboard(events);
  const merged = players.filter((p) => String(p.playerId) === '1287124');
  assert.equal(merged.length, 1);
  assert.equal(merged[0].displayName, 'LikeHere'); // February is the latest
  assert.equal(merged[0].tournamentsAttended, 2);
  assert.equal(players.length, 2);

  const { final } = computeRatings([{ seasonId: 0, events }]);
  assert.equal(final.overall.has('2353012'), false);
  assert.ok(final.overall.get('1287124') > 1500);
});
