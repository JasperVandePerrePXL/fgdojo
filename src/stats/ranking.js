// Win rate and the weighted ranking score.

/**
 * Weights of the ranking score (they add up to 1). Changing them changes every ranking:
 * update the README ("Counting rules") and tests/leaderboard.test.js as well.
 */
export const RANKING_WEIGHTS = {
  winRate: 0.4,
  attendance: 0.25,
  wins: 0.35,
};

/** Win rate in percent (0-100) from games won and lost; 0 when no games were played. */
export function calculateWinRate({ gamesWon, gamesLost }) {
  const played = gamesWon + gamesLost;
  return played > 0 ? (gamesWon / played) * 100 : 0;
}

/**
 * Weighted score: 40% win rate, 25% attendance and 35% dojo wins. Attendance and wins are
 * normalized against the best player in the same ranking, so the result is on a 0-100 scale.
 * @param {{ winRateNum?: number, tournamentsAttended?: number, firstPlaces?: number }} player
 * @param {number} [maxAttendance] Highest `tournamentsAttended` in the ranking.
 * @param {number} [maxFirstPlaces] Highest `firstPlaces` in the ranking.
 */
export function calculateRankingScore(player, maxAttendance = 1, maxFirstPlaces = 1) {
  const winRate = Number(player.winRateNum ?? 0);
  const attendanceScore = maxAttendance > 0
    ? (Number(player.tournamentsAttended ?? 0) / maxAttendance) * 100
    : 0;
  const winsScore = maxFirstPlaces > 0
    ? (Number(player.firstPlaces ?? 0) / maxFirstPlaces) * 100
    : 0;

  return (winRate * RANKING_WEIGHTS.winRate)
    + (attendanceScore * RANKING_WEIGHTS.attendance)
    + (winsScore * RANKING_WEIGHTS.wins);
}

/**
 * Adds `winRateNum`, `winRate` and `rankingScore` to every player of one ranking.
 * @param {Map<string|number, object>} playerMap Player stats by player ID.
 * @returns {object[]} New player objects (the input is not modified).
 */
export function addRankingScores(playerMap) {
  const players = Array.from(playerMap.values()).map((player) => {
    const winRateNum = calculateWinRate(player);
    return { ...player, winRateNum, winRate: winRateNum.toFixed(2) };
  });
  const maxAttendance = Math.max(1, ...players.map((player) => player.tournamentsAttended));
  const maxFirstPlaces = Math.max(1, ...players.map((player) => player.firstPlaces));

  return players.map((player) => ({
    ...player,
    rankingScore: Number(calculateRankingScore(player, maxAttendance, maxFirstPlaces).toFixed(2)),
  }));
}
