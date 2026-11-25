// Builds the per-season (and combined) object stored in public/data/leaderboards.json.
import { processLeaderboard } from './leaderboard.js';
import { calculateFunStats } from './fun_stats.js';

/**
 * @param {{ seasonId: number, seasonName: string, events: object[],
 *   ratings?: import('./elo.js').RatingSnapshot }} input
 *   `seasonId` is -1 for the combined "all seasons" entry; `ratings` are the Elo ratings at the end of the season.
 * @returns {import('./types.js').LeaderboardOutput}
 */
export function buildLeaderboardOutput({ seasonId, seasonName, events, ratings }) {
  const { players, tournaments, games, dojoCount } = processLeaderboard(events, ratings);

  return {
    seasonId,
    seasonName,
    summary: {
      totalPlayers: players.length,
      totalDojos: dojoCount,
    },
    players: [...players].sort((a, b) => b.tournamentsAttended - a.tournamentsAttended),
    games: games.map((game) => ({ ...game, funStats: calculateFunStats(game.players) })),
    tournaments,
    funStats: calculateFunStats(players),
  };
}
