// Small pure helpers used by the interface components.

/** Number of players shown in each "All-time highlights" list. */
export const HIGHLIGHT_COUNT = 3;
/** A win rate highlight needs at least this many games (same rule as the data pipeline). */
export const MIN_GAMES_FOR_WIN_RATE = 10;

/**
 * CSS class for a win rate: `high` (60%+), `medium` (45%+) or `low`.
 * @param {number} rate Win rate in percent.
 */
export function rateClass(rate) {
  return rate >= 60 ? 'high' : rate >= 45 ? 'medium' : 'low';
}

/**
 * The best players by some value, highest first.
 * @param {object[]} players
 * @param {(player: object) => number} value Sort key (higher is better).
 * @param {(player: object) => boolean} [filter] Players that do not pass are left out.
 */
export function topPlayers(players, value, filter = () => true, count = HIGHLIGHT_COUNT) {
  return [...players].filter(filter).sort((a, b) => value(b) - value(a)).slice(0, count);
}

/** Ranking score with one decimal; returns the input unchanged when it is not a number. */
export function formatScore(score) {
  return score?.toFixed ? score.toFixed(1) : score;
}

/**
 * Identifier of a dojo (tournament day) in the event history; a dojo with several games counts once.
 * Mirrors `dojoKeyOf` in src/stats/dojo.js.
 */
export function dojoKeyOf(tournament) {
  return tournament.dojoId || `${tournament.date || ''}|${tournament.name || ''}`;
}
