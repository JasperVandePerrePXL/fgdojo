// "Fun stats": the top lists defined in shared/highlights.js, stored with each season and game
// in leaderboards.json and shown in the "All-time highlights" panel of the website.
import { HIGHLIGHTS } from '../../shared/highlights.js';

/** Number of players stored per list. */
export const FUN_STATS_COUNT = 5;

/** The fields of a player that a highlight entry keeps. */
function toHighlightEntry(player) {
  const { displayName, firstPlaces, tournamentsAttended, winRate, gamesWon, gamesLost } = player;
  return { displayName, firstPlaces, tournamentsAttended, winRate, gamesWon, gamesLost };
}

/**
 * Best players for one highlight, highest score first (ties keep the input order).
 * @param {import('./types.js').PlayerStats[]} players
 * @param {import('../../shared/highlights.js').HighlightDefinition} highlight
 */
function topPlayersFor(players, { score, eligible = () => true }) {
  return players
    .filter(eligible)
    .sort((a, b) => score(b) - score(a))
    .slice(0, FUN_STATS_COUNT)
    .map(toHighlightEntry);
}

/**
 * @param {import('./types.js').PlayerStats[]} players
 * @returns {import('./types.js').FunStats} One list per highlight, keyed by highlight ID.
 */
export function calculateFunStats(players) {
  return Object.fromEntries(HIGHLIGHTS.map((highlight) => [highlight.id, topPlayersFor(players, highlight)]));
}
