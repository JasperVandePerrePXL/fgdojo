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
    /** Current ratings, rounded, by player ID. */
    snapshot() {
      return new Map([...players].map(([id, { rating }]) => [id, Math.round(rating)]));
    },
  };
}

/** Applies every rated set of one event to the overall pool and to the pool of its game. */
function recordEvent(event, overall, gamePool) {
  const hidden = hiddenPlayerIds(event);
  const entrants = event.entrants?.nodes?.length ?? event.entrants?.pageInfo?.total ?? 0;
  const sizeWeight = bracketFactor(entrants);

  for (const set of event.sets?.nodes ?? []) {
    const played = readSet(set);
    if (!played || hidden.has(played.p1) || hidden.has(played.p2)) continue;
    const [winnerScore, loserScore] = played.p1Won
      ? [played.score1, played.score2]
      : [played.score2, played.score1];
    const weight = sizeWeight * marginFactor(winnerScore, loserScore);
    overall.record(played.p1, played.p2, played.p1Won, weight);
    gamePool?.record(played.p1, played.p2, played.p1Won, weight);
  }
}

/**
 * @typedef {object} RatingSnapshot
 * @property {Map<string, number>} overall  Rating over all games, by player ID.
 * @property {Map<string, Map<string, number>>} byGame  Rating per game (start.gg videogame ID), by player ID.
 */

/**
 * Runs all seasons in order and records the ratings at the end of each season.
 * @param {{ seasonId: number, events: object[] }[]} seasons In chronological order.
 * @returns {{ bySeason: Map<number, RatingSnapshot>, final: RatingSnapshot }}
 */
export function computeRatings(seasons) {
  const overall = createPool();
  const games = new Map(); // videogame ID -> pool
  const snapshot = () => ({
    overall: overall.snapshot(),
    byGame: new Map([...games].map(([gameId, pool]) => [gameId, pool.snapshot()])),
  });

  const bySeason = new Map();
  for (const { seasonId, events } of seasons) {
    const ordered = [...events].sort((a, b) => (a.tournament?.startAt ?? 0) - (b.tournament?.startAt ?? 0));
    for (const event of ordered) {
      const gameId = event.videogame?.id == null ? null : String(event.videogame.id);
      if (gameId && !games.has(gameId)) games.set(gameId, createPool());
      recordEvent(event, overall, gameId ? games.get(gameId) : null);
    }
    bySeason.set(seasonId, snapshot());
  }
  return { bySeason, final: snapshot() };
}
