import test from 'node:test';
import assert from 'node:assert/strict';
import { processLeaderboard } from '../src/stats/leaderboard.js';
import { calculateFunStats } from '../src/stats/fun_stats.js';
import { MIN_DOJOS_FOR_RANKING } from '../src/stats/ranking.js';
import { START_RATING } from '../src/stats/elo.js';
import { isHiddenPlayer } from '../src/config/hidden_players.js';

function event(overrides = {}) {
  return {
    name: '1v1 Test Fighter',
    tournament: { name: 'Fighting Game Dojo - Test', startAt: 1767225600 },
    videogame: { id: 1, name: 'Test Fighter' },
    entrants: {
      pageInfo: { total: 2 },
      nodes: [
        {
          standing: { placement: 1 },
          participants: [{ id: 11, gamerTag: 'Alice', player: { id: 11, gamerTag: 'Alice' }, prefix: '' }],
        },
        {
          standing: { placement: 2 },
          participants: [{ id: 22, gamerTag: 'Bob', player: { id: 22, gamerTag: 'Bob' }, prefix: '' }],
        },
      ],
    },
    standings: { nodes: [{ placement: 1, entrant: { participants: [{ gamerTag: 'Alice' }] } }] },
    sets: {
      nodes: [
        {
          slots: [
            {
              entrant: { participants: [{ id: 11, player: { id: 11 } }] },
              standing: { stats: { score: { value: 3 } } },
            },
            {
              entrant: { participants: [{ id: 22, player: { id: 22 } }] },
              standing: { stats: { score: { value: 1 } } },
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

test('processLeaderboard records winners, attendance, and set scores', () => {
  const result = processLeaderboard([event()]);
  assert.equal(result.tournaments.length, 1);
  assert.equal(result.tournaments[0].winner, 'Alice');
  assert.equal(result.players.length, 2);

  const alice = result.players.find((player) => player.gamerTag === 'Alice');
  assert.equal(alice.firstPlaces, 1);
  assert.equal(alice.tournamentsAttended, 1);
  assert.equal(alice.gamesWon, 3);
  assert.equal(alice.gamesLost, 1);

  assert.equal(result.games.length, 1);
  assert.equal(result.games[0].gameName, 'Test Fighter');
});

test('configured hidden player is excluded from leaderboard results', () => {
  assert.equal(isHiddenPlayer({ displayName: 'HM! | Biscuit' }), true);

  const result = processLeaderboard([
    event({
      entrants: {
        pageInfo: { total: 1 },
        nodes: [
          {
            standing: { placement: 1 },
            participants: [
              { id: 99, gamerTag: 'Biscuit', player: { id: 99, gamerTag: 'Biscuit' }, prefix: 'HM!' },
            ],
          },
        ],
      },
      standings: {
        nodes: [
          {
            placement: 1,
            entrant: {
              name: 'HM! | Biscuit',
              participants: [{ id: 99, gamerTag: 'Biscuit', player: { id: 99 } }],
            },
          },
        ],
      },
    }),
  ]);

  assert.equal(
    result.players.some((player) => player.displayName === 'HM! | Biscuit'),
    false,
  );
  assert.equal(result.tournaments[0].winner, null);
});

test('processLeaderboard adds ratings and only ranks players with 2+ dojos', () => {
  const ratings = { overall: new Map([['11', 1600]]), byGame: new Map([['1', new Map([['11', 1580]])]]) };
  const oneDojo = processLeaderboard([event()], ratings);
  const alice = oneDojo.players.find((player) => player.gamerTag === 'Alice');
  assert.equal(alice.rating, 1600);
  assert.equal(oneDojo.games[0].players.find((player) => player.gamerTag === 'Alice').rating, 1580);
  assert.equal(oneDojo.players.find((player) => player.gamerTag === 'Bob').rating, START_RATING);
  assert.equal(alice.ranked, false);

  const secondDojo = event({
    tournament: { slug: 'second', name: 'Second', startAt: 1767225600 + 86400 * 30 },
  });
  const twoDojos = processLeaderboard([event(), secondDojo], ratings);
  assert.equal(
    twoDojos.players.every((player) => player.ranked),
    true,
  );
  assert.equal(MIN_DOJOS_FOR_RANKING, 2);
});

test('processLeaderboard does not divide by zero', () => {
  const result = processLeaderboard([event({ sets: { nodes: [] } })]);
  for (const player of result.players) {
    assert.equal(player.winRateNum, 0);
  }
});

test('players count one dojo visit across multiple games', () => {
  const result = processLeaderboard([
    event({ videogame: { id: 1, name: 'Game A' } }),
    event({ videogame: { id: 2, name: 'Game B' } }),
  ]);
  assert.equal(result.dojoCount, 1);
  assert.equal(result.summary, undefined);
  for (const player of result.players) {
    assert.equal(player.tournamentsAttended, 1);
  }
});

test('calculateFunStats requires 10 games for highest win rate', () => {
  const result = processLeaderboard([event({ sets: { nodes: [] } })]);
  const stats = calculateFunStats(result.players);
  assert.equal(stats.highestWinRate.length, 0);
  assert.equal(stats.mostTournamentsAttended.length, 2);
});
