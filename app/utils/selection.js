// Choosing the season to show when the leaderboard loads.

/**
 * The remembered season when it still exists, else the latest season.
 * A missing or invalid remembered value (null, '', 'null') must not match season 0:
 * `Number(null)` and `Number('')` are 0.
 * @param {number[]} seasons Season IDs, ascending.
 * @param {string|null} remembered Value from localStorage.
 * @returns {string} Season ID as a string ('' when there are no seasons).
 */
export function pickSeason(seasons, remembered) {
  const isValid =
    typeof remembered === 'string' && /^\d+$/.test(remembered) && seasons.includes(Number(remembered));
  return isValid ? remembered : String(seasons.at(-1) ?? '');
}
