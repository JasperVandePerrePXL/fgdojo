// Hand-maintained configuration: which seasons, tournaments and games exist.
//   data/tournament_slugs.json  seasons -> tournaments (only the tournament slug is entered)
//   data/games.json             game ID -> known start.gg event slug variants
// This module expands "tournament + game" into the full start.gg event slugs the fetcher tries.
import { readJsonSync } from '../lib/json.js';
import { GAMES_FILE, TOURNAMENT_SLUGS_FILE } from '../lib/paths.js';

export const TOURNAMENT_CONFIG = readJsonSync(TOURNAMENT_SLUGS_FILE);
export const GAMES = readJsonSync(GAMES_FILE).games;

/**
 * Accepts a bare slug, `tournament/<slug>` or a full start.gg URL and returns the bare slug.
 * @param {string} input
 * @returns {string} e.g. `fighting-game-dojo-march-edition`
 * @throws {Error} when the result is not a valid slug (lowercase letters, digits and dashes).
 */
export function normalizeTournamentSlug(input) {
  const value = String(input ?? '')
    .trim()
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
  const match = value.match(/(?:^|\/)tournament\/([^/]+)(?:\/|$)/);
  const slug = match ? match[1] : value;
  if (!/^[-a-z0-9]+$/.test(slug)) {
    throw new Error(`Invalid tournament slug "${input}". Use a slug or start.gg tournament URL.`);
  }
  return slug;
}

/** Game IDs of a season: the season's own `games`, else the global `defaultGames`. */
export function getSeasonGames(season) {
  return season.games ?? TOURNAMENT_CONFIG.defaultGames ?? [];
}

/** Game IDs of one tournament: its own `games` override, else the season's games. */
export function getTournamentGames(season, tournament) {
  return tournament.games ?? getSeasonGames(season);
}

/**
 * Full start.gg event slugs to try for one game at one tournament, in order.
 * @example getGameEventCandidates('my-tournament', 'tekken-8')
 *   // ['tournament/my-tournament/event/1v1-tekken-8-ps5', ...]
 * @throws {Error} when the game ID is not defined in data/games.json.
 */
export function getGameEventCandidates(tournamentSlug, gameId) {
  const game = GAMES[gameId];
  if (!game) throw new Error(`Unknown game ID "${gameId}". Add it to data/games.json.`);
  const slug = normalizeTournamentSlug(tournamentSlug);
  return game.eventSlugs.map((eventSlug) => `tournament/${slug}/event/${eventSlug}`);
}

/**
 * Seasons in ascending ID order.
 * @returns {{ id: string, name: string }[]}
 */
export function listSeasons() {
  return Object.entries(TOURNAMENT_CONFIG.seasons ?? {}).map(([id, season]) => ({ id, name: season.name }));
}
