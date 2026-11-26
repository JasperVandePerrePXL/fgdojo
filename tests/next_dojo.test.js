import test from 'node:test';
import assert from 'node:assert/strict';
import { toNextDojo } from '../src/stats/next_dojo.js';
import { brusselsNow, dojoPhase, isResultsRefreshTime } from '../shared/dojo_time.js';

// Saturday 28 November 2026, 00:00 in Brussels (start.gg stores the dojo start as midnight).
const NOV_28 = Date.UTC(2026, 10, 27, 23) / 1000;
const tournament = {
  name: 'Fighting Game Dojo - November edition',
  slug: 'tournament/fighting-game-dojo-november-edition-1',
  startAt: NOV_28,
  events: [
    {
      name: '1v1 Street Fighter 6 (PC)',
      slug: 'tournament/fighting-game-dojo-november-edition-1/event/1v1-sf6',
      videogame: { name: 'Street Fighter 6' },
      entrants: { pageInfo: { total: 11 } },
    },
    { name: '1v1 Marvel Tokon (PS5)', videogame: null, entrants: null },
  ],
};
const at = (iso) => Date.parse(iso) / 1000;

test('toNextDojo builds the card data with sign-ups and bracket links per game', () => {
  assert.deepEqual(toNextDojo(tournament, at('2026-11-26T12:00:00Z')), {
    name: 'Fighting Game Dojo - November edition',
    url: 'https://www.start.gg/tournament/fighting-game-dojo-november-edition-1',
    date: '2026-11-28',
    games: [
      {
        gameName: 'Street Fighter 6',
        entrants: 11,
        url: 'https://www.start.gg/tournament/fighting-game-dojo-november-edition-1/event/1v1-sf6',
      },
      {
        gameName: '1v1 Marvel Tokon (PS5)',
        entrants: 0,
        url: 'https://www.start.gg/tournament/fighting-game-dojo-november-edition-1',
      },
    ],
  });
});

test('toNextDojo keeps the dojo on its own day and drops it the day after', () => {
  assert.equal(toNextDojo(tournament, at('2026-11-28T22:59:00Z')).date, '2026-11-28'); // 23:59 Brussels
  assert.equal(toNextDojo(tournament, at('2026-11-28T23:01:00Z')), null); // 00:01 Sunday
  assert.equal(toNextDojo(null, at('2026-11-26T12:00:00Z')), null);
});

test('dojoPhase: upcoming until sign-ups close at 13:58 on the day, then live, then over', () => {
  const dojo = { date: '2026-11-28' };
  assert.equal(dojoPhase(dojo, new Date('2026-11-27T20:00:00Z')), 'upcoming');
  assert.equal(dojoPhase(dojo, new Date('2026-11-28T12:57:00Z')), 'upcoming'); // 13:57 Brussels
  assert.equal(dojoPhase(dojo, new Date('2026-11-28T12:58:00Z')), 'live'); // 13:58 Brussels
  assert.equal(dojoPhase(dojo, new Date('2026-11-28T22:59:00Z')), 'live'); // 23:59
  assert.equal(dojoPhase(dojo, new Date('2026-11-28T23:00:00Z')), 'over'); // 00:00 Sunday
  assert.equal(dojoPhase(null, new Date()), null);
  // Summer time: 13:58 in Brussels is 11:58 UTC.
  assert.equal(dojoPhase({ date: '2027-06-12' }, new Date('2027-06-12T11:58:00Z')), 'live');
});

test('results refresh only on the dojo day from 13:00 to 23:00 Brussels time', () => {
  const dojo = { date: '2026-11-28' };
  assert.equal(isResultsRefreshTime(dojo, new Date('2026-11-28T11:59:00Z')), false); // 12:59
  assert.equal(isResultsRefreshTime(dojo, new Date('2026-11-28T12:00:00Z')), true); // 13:00
  assert.equal(isResultsRefreshTime(dojo, new Date('2026-11-28T21:59:00Z')), true); // 22:59
  assert.equal(isResultsRefreshTime(dojo, new Date('2026-11-28T22:00:00Z')), false); // 23:00
  assert.equal(isResultsRefreshTime(dojo, new Date('2026-11-29T14:00:00Z')), false); // next day
  assert.equal(isResultsRefreshTime(null, new Date()), false);
  assert.deepEqual(brusselsNow(new Date('2026-11-28T00:30:00Z')), { date: '2026-11-28', time: '01:30' });
});
