// Shape of the data produced by the statistics modules (documentation only, no runtime code).
// A new statistic or chart should read these shapes from `public/data/leaderboards.json`.

/**
 * One tournament as shown in the "Event history" list (one entry per game event).
 * @typedef {object} TournamentInfo
 * @property {string|null} dojoId    Tournament slug; identifies the dojo across its game events.
 * @property {string} name           Tournament name.
 * @property {string|null} date      `YYYY-MM-DD` in Brussels time.
 * @property {string} eventName      Name of the game event, e.g. "1v1 Street Fighter 6".
 * @property {string|null} winner    Display name of the winner, or null (unknown or hidden player).
 * @property {number} entrantCount
 */

/**
 * Statistics of one player, within one game or across all games.
 * @typedef {object} PlayerStats
 * @property {string|number} playerId  Stable start.gg player ID.
 * @property {string} gamerTag
 * @property {string} prefix           Sponsor/crew prefix ("" when none).
 * @property {string} displayName      "prefix | gamerTag" or just the gamerTag; latest name wins.
 * @property {number} tournamentsAttended  Unique dojos attended (not game entries).
 * @property {number} gamesWon         Games (set score points) won.
 * @property {number} gamesLost
 * @property {number} firstPlaces      Dojos won.
 * @property {{ tournament: string, placement: number }[]} placements
 * @property {number} winRateNum       Win rate in percent (0-100).
 * @property {string} winRate          `winRateNum` with two decimals.
 * @property {number} rankingScore     Weighted ranking score, see ranking.js.
 */

/**
 * @typedef {object} GameStats
 * @property {number|string} gameId
 * @property {string} gameName
 * @property {PlayerStats[]} players
 * @property {TournamentInfo[]} tournaments
 */

/**
 * Result of `processLeaderboard(events)`.
 * @typedef {object} LeaderboardResult
 * @property {PlayerStats[]} players   Across all games.
 * @property {TournamentInfo[]} tournaments
 * @property {GameStats[]} games
 * @property {number} dojoCount        Unique dojos (a dojo with several games counts once).
 */

/**
 * One season (or the combined "all seasons" entry, `seasonId` -1) in `leaderboards.json`.
 * @typedef {object} LeaderboardOutput
 * @property {number} seasonId
 * @property {string} seasonName
 * @property {{ totalPlayers: number, totalTournaments: number, totalDojos: number }} summary
 * @property {PlayerStats[]} players
 * @property {GameStats[]} games
 * @property {TournamentInfo[]} tournaments
 * @property {object} funStats         See fun_stats.js.
 */

export {};
