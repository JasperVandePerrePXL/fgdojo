// Win rate, Elo rating and who is ranked. The rating itself is calculated in elo.js.
import { START_RATING } from './elo.js';

/** A player needs at least this many dojos (in that season and game) to appear in the ranking. */
export const MIN_DOJOS_FOR_RANKING = 2;

/** Win rate in percent (0-100) from games won and lost; 0 when no games were played. */
export function calculateWinRate({ gamesWon, gamesLost }) {
  const played = gamesWon + gamesLost;
  return played > 0 ? (gamesWon / played) * 100 : 0;
}

/**
 * Adds `winRateNum`, `winRate`, `rating` and `ranked` to every player of one ranking.
 * @param {Map<string|number, object>} playerMap Player stats by player ID.
 * @param {Map<string, number>} [ratings] Elo rating by player ID (players without sets keep START_RATING).
 * @returns {object[]} New player objects (the input is not modified).
 */
export function addRatings(playerMap, ratings = new Map()) {
  return Array.from(playerMap.values()).map((player) => {
    const winRateNum = calculateWinRate(player);
    return {
      ...player,
      winRateNum,
      winRate: winRateNum.toFixed(2),
      rating: ratings.get(String(player.playerId)) ?? START_RATING,
      ranked: player.tournamentsAttended >= MIN_DOJOS_FOR_RANKING,
    };
  });
}
