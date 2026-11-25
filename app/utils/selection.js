// Choosing the season to show when the leaderboard loads.

/** Pseudo season ID of the "All seasons" leaderboard (the `combined` entry of leaderboards.json). */
export const ALL_SEASONS_ID = 'all';

/**
 * The remembered season when it still exists (or "All seasons"), else the latest season.
 * A missing or invalid remembered value (null, '', 'null') must not match season 0:
 * `Number(null)` and `Number('')` are 0.
 * @param {number[]} seasons Season IDs, ascending.
 * @param {string|null} remembered Value from localStorage.
 * @returns {string} Season ID as a string ('' when there are no seasons).
 */
export function pickSeason(seasons, remembered) {
  const isValid =
    typeof remembered === 'string' && /^\d+$/.test(remembered) && seasons.includes(Number(remembered));
  if (remembered === ALL_SEASONS_ID && seasons.length) return ALL_SEASONS_ID;
  return isValid ? remembered : String(seasons.at(-1) ?? '');
}
