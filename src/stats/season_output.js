// Builds the per-season (and combined) object stored in public/data/leaderboards.json.
import { processLeaderboard } from './leaderboard.js';
import { calculateFunStats } from './fun_stats.js';

/**
 * @param {{ seasonId: number, seasonName: string, events: object[] }} input
 *   `seasonId` is -1 for the combined "all seasons" entry.
 * @returns {import('./types.js').LeaderboardOutput}
 */
export function buildLeaderboardOutput({ seasonId, seasonName, events }) {
  const { players, tournaments, games, dojoCount } = processLeaderboard(events);
  const funStats = calculateFunStats(players); // must run before the players are re-sorted below

  return {
    seasonId,
    seasonName,
    summary: {
      totalPlayers: players.length,
      totalTournaments: dojoCount,
      totalDojos: dojoCount,
    },
    players: players.sort((a, b) => b.tournamentsAttended - a.tournamentsAttended),
    games,
    tournaments,
    funStats,
  };
}
