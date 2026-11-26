// Elo skill rating, calculated from every 1v1 set in date order. Ratings carry over between seasons:
// a season's ranking shows each player's rating at the end of that season.
//
// Per set, each player's rating moves by  K × bracket factor × margin factor × (result − expected result):
//  - K is 64 for a player's first PROVISIONAL_SETS sets (newcomers reach their level quickly), then 32;
//  - the bracket factor scales with the number of entrants of that game at that dojo (4 → 0.5, 16 → 1, 32 → 1.25);
//  - the margin factor gives clean wins a little more weight (2-0 / 3-1 → 1.1, 3-0 → 1.2, close sets → 1).
// Hidden players' sets and disqualifications are skipped. Pure functions: no file or network access.
import { hiddenPlayerIds, readSet } from './sets.js';

export const START_RATING = 1500;
export const K_FACTOR = 32;
export const PROVISIONAL_K_FACTOR = 64;
export const PROVISIONAL_SETS = 10;

/** Chance (0-1) that a player with `rating` beats one with `opponentRating`. */
export function expectedScore(rating, opponentRating) {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

/** Weight of a set by bracket size: log2(entrants) / 4, kept between 0.5 and 1.5 (16 entrants = 1). */
export function bracketFactor(entrants) {
  return Math.min(1.5, Math.max(0.5, Math.log2(Math.max(2, entrants)) / 4));
}

/** Extra weight for a clean win: +0.1 per game of margin beyond 1, at most +0.2. Unknown scores count as 1. */
export function marginFactor(winnerScore, loserScore) {
  const margin = winnerScore - loserScore;
  return 1 + 0.1 * Math.min(2, Math.max(0, margin - 1));
}

/** One independent rating pool (overall, or one game). */
function createPool() {
  const players = new Map(); // playerId -> { rating, sets }
  const get = (id) => {
    if (!players.has(id)) players.set(id, { rating: START_RATING, sets: 0 });
    return players.get(id);
  };

  return {
    /** Applies one set result. `weight` = bracket factor × margin factor. */
    record(p1, p2, p1Won, weight) {
      const a = get(p1);
      const b = get(p2);
      const expectedA = expectedScore(a.rating, b.rating);
      const kA = (a.sets < PROVISIONAL_SETS ? PROVISIONAL_K_FACTOR : K_FACTOR) * weight;
      const kB = (b.sets < PROVISIONAL_SETS ? PROVISIONAL_K_FACTOR : K_FACTOR) * weight;
      a.rating += kA * ((p1Won ? 1 : 0) - expectedA);
      b.rating += kB * ((p1Won ? 0 : 1) - (1 - expectedA));
      a.sets += 1;
      b.sets += 1;
    },
    /** Current rating of one player, rounded (START_RATING when unknown). */
    ratingOf(id) {
      return Math.round(players.get(id)?.rating ?? START_RATING);
    },
    /** Current ratings, rounded, by player ID. */
    snapshot() {
      return new Map([...players].map(([id, { rating }]) => [id, Math.round(rating)]));
    },
  };
}

/**
 * Applies every rated set of one event to the overall pool and to the pool of its game.
 * @returns {Set<string>} IDs of the players who played at least one rated set in the event.
 */
function recordEvent(event, overall, gamePool) {
  const played = new Set();
  const hidden = hiddenPlayerIds(event);
  const entrants = event.entrants?.nodes?.length ?? event.entrants?.pageInfo?.total ?? 0;
  const sizeWeight = bracketFactor(entrants);

  for (const set of event.sets?.nodes ?? []) {
    const result = readSet(set);
    if (!result || hidden.has(result.p1) || hidden.has(result.p2)) continue;
    const [winnerScore, loserScore] = result.p1Won
      ? [result.score1, result.score2]
      : [result.score2, result.score1];
    const weight = sizeWeight * marginFactor(winnerScore, loserScore);
    overall.record(result.p1, result.p2, result.p1Won, weight);
    gamePool?.record(result.p1, result.p2, result.p1Won, weight);
    played.add(result.p1).add(result.p2);
  }
  return played;
}

/** Adds the rating after this dojo to the history of every player who played in it. */
function recordHistory(historyByGame, gameId, pool, playerIds, tournament) {
  if (!historyByGame.has(gameId)) historyByGame.set(gameId, new Map());
  const history = historyByGame.get(gameId);
  for (const id of playerIds) {
    if (!history.has(id)) history.set(id, []);
    history.get(id).push({
      startAt: tournament?.startAt ?? 0,
      dojoId: tournament?.slug ?? null,
      rating: pool.ratingOf(id),
    });
  }
}

/**
 * @typedef {object} RatingSnapshot
 * @property {Map<string, number>} overall  Rating over all games, by player ID.
 * @property {Map<string, Map<string, number>>} byGame  Rating per game (start.gg videogame ID), by player ID.
 */

/**
 * One point of a player's rating history in one game: the rating after a dojo.
 * @typedef {object} RatingPoint
 * @property {number} startAt   Tournament start (Unix seconds).
 * @property {string|null} dojoId  Tournament slug.
 * @property {number} rating    Rating in that game after the dojo, rounded.
 */

/**
 * Runs all seasons in order and records the ratings at the end of each season.
 * @param {{ seasonId: number, events: object[] }[]} seasons In chronological order.
 * @returns {{ bySeason: Map<number, RatingSnapshot>, final: RatingSnapshot,
 *   historyByGame: Map<string, Map<string, RatingPoint[]>> }}
 *   `historyByGame`: per game and player, the rating after every dojo where the player played a rated set.
 */
export function computeRatings(seasons) {
  const overall = createPool();
  const games = new Map(); // videogame ID -> pool
  const snapshot = () => ({
    overall: overall.snapshot(),
    byGame: new Map([...games].map(([gameId, pool]) => [gameId, pool.snapshot()])),
  });

  const bySeason = new Map();
  const historyByGame = new Map(); // videogame ID -> player ID -> RatingPoint[]
  for (const { seasonId, events } of seasons) {
    const ordered = [...events].sort((a, b) => (a.tournament?.startAt ?? 0) - (b.tournament?.startAt ?? 0));
    for (const event of ordered) {
      const gameId = event.videogame?.id == null ? null : String(event.videogame.id);
      if (gameId && !games.has(gameId)) games.set(gameId, createPool());
      const played = recordEvent(event, overall, gameId ? games.get(gameId) : null);
      if (gameId) recordHistory(historyByGame, gameId, games.get(gameId), played, event.tournament);
    }
    bySeason.set(seasonId, snapshot());
  }
  return { bySeason, final: snapshot(), historyByGame };
}
