import fs from 'node:fs';

const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'),
);

export const TOURNAMENT_CONFIG = readJson('../data/tournament_slugs.json');
const GAMES_CONFIG = readJson('../data/games.json');
export const GAMES = GAMES_CONFIG.games;

export function normalizeTournamentSlug(input) {
  const value = String(input ?? '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  const match = value.match(/(?:^|\/)tournament\/([^/]+)(?:\/|$)/);
  const slug = match ? match[1] : value;
  if (!/^[-a-z0-9]+$/.test(slug)) {
    throw new Error(`Invalid tournament slug "${input}". Use a slug or start.gg tournament URL.`);
  }
  return slug;
}

export function getSeasonGames(season) {
  return season.games ?? TOURNAMENT_CONFIG.defaultGames ?? [];
}

export function getTournamentGames(season, tournament) {
  return tournament.games ?? getSeasonGames(season);
}

export function getGameEventCandidates(tournamentSlug, gameId) {
  const game = GAMES[gameId];
  if (!game) throw new Error(`Unknown game ID "${gameId}". Add it to data/games.json.`);
  const slug = normalizeTournamentSlug(tournamentSlug);
  return game.eventSlugs.map((eventSlug) => `tournament/${slug}/event/${eventSlug}`);
}

export function getConfiguredSlugs() {
  const result = {};
  for (const [seasonId, season] of Object.entries(TOURNAMENT_CONFIG.seasons ?? {})) {
    result[seasonId] = [];
    for (const tournament of season.tournaments ?? []) {
      for (const gameId of getTournamentGames(season, tournament)) {
        result[seasonId].push(...getGameEventCandidates(tournament.slug, gameId));
      }
    }
  }
  return result;
}
