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
 * @property {FunStats} [funStats]   Added by season_output.js.
 */

/**
 * One player in a highlight list.
 * @typedef {object} HighlightEntry
 * @property {string} displayName
 * @property {number} firstPlaces
 * @property {number} tournamentsAttended
 * @property {string} winRate
 * @property {number} gamesWon
 * @property {number} gamesLost
 */

/**
 * Top lists keyed by highlight ID (see shared/highlights.js), best player first.
 * @typedef {Record<string, HighlightEntry[]>} FunStats
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
 * @property {{ totalPlayers: number, totalDojos: number }} summary
 * @property {PlayerStats[]} players
 * @property {GameStats[]} games
 * @property {TournamentInfo[]} tournaments
 * @property {FunStats} funStats       Highlights across all games of the season.
 */

/**
 * One head-to-head record on the stats page.
 * @typedef {{ playerA: string, playerB: string, winsA: number, winsB: number, sets: number }} Rivalry
 */

/**
 * Data of the stats page (`public/data/stats.json`), built by site_stats.js over every season.
 * @typedef {object} SiteStats
 * @property {{ dojos: number, players: number, sets: number, games: number }} totals
 * @property {{ gameName: string, entrants: number, rivalries: Rivalry[] }[]} games
 *   In order of first appearance; `rivalries` = the most played 1v1 matchups of that game (DQs excluded).
 * @property {{ dojoId: string, name: string, date: string|null, seasonId: number, players: number,
 *   newPlayers: number, returningPlayers: number, entrantsByGame: Record<string, number>,
 *   sets: number, games: number, playerIds: string[] }[]} dojos
 *   Oldest first. `players` = unique players; `newPlayers` = first dojo ever for them;
 *   `playerIds` = start.gg player IDs, so the page can count unique players over a date range.
 * @property {{ seasonId: number, seasonName: string, dojos: number, uniquePlayers: number,
 *   averageAttendance: number, entrants: number, sets: number, games: number }[]} seasons
 *   `entrants` counts game entries (a player in two games counts twice).
 */

export {};
