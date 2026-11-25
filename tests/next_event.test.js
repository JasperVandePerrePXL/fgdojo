import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractTournamentSlug,
  formatTournamentEntry,
  normalizeTournamentSlug,
  findExistingTournament,
  seasonIdForTimestamp,
  updateNextEventConfig,
} from '../src/next_event.js';

const slug = 'fighting-game-dojo-march-edition';

test('normalizes tournament slugs and start.gg URLs', () => {
  assert.equal(normalizeTournamentSlug(slug), slug);
  assert.equal(normalizeTournamentSlug(`tournament/${slug}`), slug);
  assert.equal(normalizeTournamentSlug(`https://www.start.gg/tournament/${slug}`), slug);
});

test('uses the next January tournament to start a new season', () => {
  const timestamp = Math.floor(Date.UTC(2027, 0, 16, 11, 0, 0) / 1000);
  assert.equal(seasonIdForTimestamp(timestamp), 2);

  const config = {
    defaultGames: ['street-fighter-6'],
    seasons: {
      1: { name: 'Season 1', tournaments: [] },
    },
  };

  const result = updateNextEventConfig(config, {
    slug: `tournament/${slug}`,
    startAt: timestamp,
  });

  assert.equal(result.changed, true);
  assert.equal(result.config.nextEventUrl, `https://www.start.gg/tournament/${slug}`);
  assert.equal(result.config.seasons['2'].name, 'Season 2');
  assert.deepEqual(result.config.seasons['2'].tournaments, [
    formatTournamentEntry(timestamp, slug),
  ]);
});

test('finds an existing tournament in any season and does not add it again', () => {
  const timestamp = Math.floor(Date.UTC(2026, 10, 28, 11, 0, 0) / 1000);
  const novemberSlug = 'fighting-game-dojo-november-edition-1';
  const config = {
    nextEventUrl: null,
    seasons: {
      1: {
        name: 'Season 1',
        tournaments: [{ name: "November '26 edition", slug: novemberSlug }],
      },
    },
  };

  assert.equal(findExistingTournament(config, novemberSlug).slug, novemberSlug);

  const result = updateNextEventConfig(config, {
    slug: `tournament/${novemberSlug}`,
    startAt: timestamp,
  });

  assert.equal(result.config.seasons['1'].tournaments.length, 1);
  assert.equal(result.changed, true);
  assert.equal(result.config.nextEventUrl, `https://www.start.gg/tournament/${novemberSlug}`);
});

test('does not duplicate an existing tournament', () => {
  const timestamp = Math.floor(Date.UTC(2027, 2, 20, 11, 0, 0) / 1000);
  const entry = formatTournamentEntry(timestamp, slug);
  const config = {
    nextEventUrl: `https://www.start.gg/tournament/${slug}`,
    defaultGames: ['street-fighter-6'],
    seasons: {
      2: { name: 'Season 2', tournaments: [entry] },
    },
  };

  const result = updateNextEventConfig(config, {
    slug,
    startAt: timestamp,
  });

  assert.equal(result.changed, false);
  assert.equal(result.config.seasons['2'].tournaments.length, 1);
});

test('extracts the tournament slug from the hub redirect target', () => {
  assert.equal(extractTournamentSlug('https://www.start.gg/tournament/fighting-game-dojo-november-edition-1/details'), 'fighting-game-dojo-november-edition-1');
  assert.equal(extractTournamentSlug('https://start.gg/RBHubFGDojo'), null);
});
