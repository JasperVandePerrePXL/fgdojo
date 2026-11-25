// Pure functions that update data/tournament_slugs.json with a newly found tournament.
import { getBrusselsYearMonth } from '../lib/dates.js';
import { normalizeTournamentSlug } from '../config/tournaments.js';

/** Season 0 is calendar year 2025, Season 1 is 2026, and so on: a new season starts every January. */
const SEASON_ZERO_YEAR = 2025;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Season ID of a tournament, from the Brussels calendar year of its start time. */
export function seasonIdForTimestamp(timestamp) {
  return getBrusselsYearMonth(timestamp).year - SEASON_ZERO_YEAR;
}

/** The entry added to a season, e.g. `{ name: "March '27 edition", slug }`. */
export function formatTournamentEntry(timestamp, slug) {
  const { year, month } = getBrusselsYearMonth(timestamp);
  return {
    name: `${MONTH_NAMES[month - 1]} '${String(year).slice(-2)} edition`,
    slug,
  };
}

/** Finds a tournament by slug in any season. @returns the entry, or null. */
export function findExistingTournament(config, slug) {
  for (const season of Object.values(config.seasons ?? {})) {
    for (const tournament of season.tournaments ?? []) {
      if (normalizeTournamentSlug(tournament.slug) === slug) return tournament;
    }
  }
  return null;
}

/**
 * Points `nextEventUrl` at the tournament and adds it to the right season when it is not listed yet
 * (creating the season for a new year). Game IDs are never touched. The input is not modified.
 * @param {object} config Parsed data/tournament_slugs.json.
 * @param {{ slug: string, startAt: number }} tournament
 * @returns {{ config: object, changed: boolean }} `changed` is false when nothing would be written.
 */
export function updateNextEventConfig(config, tournament) {
  if (!tournament?.slug || !tournament?.startAt) return { config, changed: false };

  const slug = normalizeTournamentSlug(tournament.slug);
  const nextConfig = structuredClone(config);
  nextConfig.nextEventUrl = `https://www.start.gg/tournament/${slug}`;

  if (!findExistingTournament(nextConfig, slug)) {
    const seasonId = String(seasonIdForTimestamp(tournament.startAt));
    nextConfig.seasons[seasonId] ??= { name: `Season ${seasonId}`, tournaments: [] };
    nextConfig.seasons[seasonId].tournaments.push(formatTournamentEntry(tournament.startAt, slug));
  }

  return {
    config: nextConfig,
    changed: JSON.stringify(nextConfig) !== JSON.stringify(config),
  };
}
