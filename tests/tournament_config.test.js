import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, TOURNAMENT_CONFIG, getGameEventCandidates, getTournamentGames, normalizeTournamentSlug } from '../src/config/tournaments.js';

test('manual season config contains valid tournament and game IDs', () => {
  for (const [seasonId, season] of Object.entries(TOURNAMENT_CONFIG.seasons)) {
    assert.ok(season.name);
    assert.ok(season.tournaments.length > 0);
    for (const tournament of season.tournaments) {
      assert.match(tournament.slug, /^[-a-z0-9]+$/);
      assert.ok(tournament.name);
      const gameIds = getTournamentGames(season, tournament);
      assert.ok(gameIds.length > 0);
      for (const gameId of gameIds) {
        assert.ok(GAMES[gameId], `Unknown game ID ${gameId} in Season ${seasonId}`);
      }
    }
  }
});

test('game IDs expand to start.gg event slug candidates', () => {
  const candidates = getGameEventCandidates('example-tournament', 'street-fighter-6');
  assert.ok(candidates.includes('tournament/example-tournament/event/1v1-fgdojo-street-fighter-6-pc'));
  assert.ok(candidates.includes('tournament/example-tournament/event/1v1-fgdojo-street-fighter-6'));
});

test('tournament URLs and bare slugs normalize identically', () => {
  assert.equal(normalizeTournamentSlug('fighting-game-dojo-december-25'), 'fighting-game-dojo-december-25');
  assert.equal(normalizeTournamentSlug('https://www.start.gg/tournament/fighting-game-dojo-december-25'), 'fighting-game-dojo-december-25');
  assert.equal(normalizeTournamentSlug('start.gg/tournament/fighting-game-dojo-december-25'), 'fighting-game-dojo-december-25');
});

test('unknown game IDs fail clearly', () => {
  assert.throws(
    () => getGameEventCandidates('example-tournament', 'unknown-game'),
    /Unknown game ID "unknown-game"/,
  );
});
