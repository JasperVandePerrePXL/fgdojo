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
 * @property {number} ratedSets        1v1 sets that count for the Elo rating (no DQs, no hidden opponents).
 * @property {number} rating           Elo rating at the end of the season (see elo.js); 1500 = start.
 * @property {boolean} ranked          Shown in the ranking: MIN_DOJOS_FOR_RANKING dojos and
 *                                     MIN_RATED_SETS_FOR_RANKING rated sets in this season and game.
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

/**
 * The next dojo (`upcomingDojo` in leaderboards.json), built by upcoming_dojo.js; null when there is none.
 * @typedef {object} UpcomingDojo
 * @property {string} name     Tournament name.
 * @property {string} url      start.gg tournament page.
 * @property {string|null} date  `YYYY-MM-DD` in Brussels time (start.gg's start time is not the real start hour).
 * @property {{ gameName: string, entrants: number }[]} games  Sign-ups per game when the data was built.
 */

/**
 * Data of the player pages (`public/data/players.json`), built by player_profiles.js over every season.
 * @typedef {object} PlayerProfiles
 * @property {Record<string, { playerId: string, displayName: string, games: PlayerGame[] }>} players
 *   By start.gg player ID. Hidden players are not included.
 */

/**
 * One game of a player page. `games` are ordered by number of dojos, most played first.
 * @typedef {object} PlayerGame
 * @property {string} gameId          start.gg videogame ID (same as `gameId` in leaderboards.json).
 * @property {string} gameName
 * @property {number|null} rating     Current Elo rating in this game (null without rated sets).
 * @property {{ date: string|null, dojoId: string|null, tournament: string, rating: number }[]} history
 *   Rating after every dojo where the player played a rated set, oldest first.
 * @property {{ date: string|null, dojoId: string|null, tournament: string, entrants: number,
 *   placement: number|null }[]} results  Every dojo entered in this game, oldest first.
 * @property {{ opponentId: string, opponentName: string, wins: number, losses: number }[]} headToHead
 *   Rated sets against each opponent, most played first.
 */

export {};
