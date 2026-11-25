// "Fun stats": top-5 lists shown in the logs and stored with each season.

/** A highest-win-rate entry needs at least this many games, so one lucky set does not win. */
export const MIN_GAMES_FOR_WIN_RATE = 10;
const TOP_COUNT = 5;

const topBy = (players, value, filter = () => true) =>
  [...players].filter(filter).sort((a, b) => value(b) - value(a)).slice(0, TOP_COUNT);

/**
 * @param {import('./types.js').PlayerStats[]} players
 * @returns {{ mostFirstPlaces: object[], highestWinRate: object[], mostTournamentsAttended: object[] }}
 */
export function calculateFunStats(players) {
  const mostFirstPlaces = topBy(players, (p) => p.firstPlaces);
  const highestWinRate = topBy(
    players,
    (p) => parseFloat(p.winRate),
    (p) => p.gamesWon + p.gamesLost >= MIN_GAMES_FOR_WIN_RATE,
  );
  const mostTournaments = topBy(players, (p) => p.tournamentsAttended);

  return {
    mostFirstPlaces: mostFirstPlaces.map((p) => ({
      displayName: p.displayName,
      firstPlaces: p.firstPlaces,
      tournamentsAttended: p.tournamentsAttended,
    })),
    highestWinRate: highestWinRate.map((p) => ({
      displayName: p.displayName,
      winRate: `${p.winRate}%`,
      gamesWon: p.gamesWon,
      gamesLost: p.gamesLost,
    })),
    mostTournamentsAttended: mostTournaments.map((p) => ({
      displayName: p.displayName,
      tournamentsAttended: p.tournamentsAttended,
      firstPlaces: p.firstPlaces,
    })),
  };
}
