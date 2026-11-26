// Seeding list for the next dojo (private, made on a TO's own computer with `npm run seeding`):
// the sign-ups of each game, highest Elo rating in that game first. Pure functions, no file or network access.
import { formatDisplayName, getPlayerId } from './names.js';

/**
 * Current Elo rating per game and player, read from the site's players.json (the ratings the ranking shows).
 * @param {import('./types.js').PlayerProfiles} profiles
 * @returns {Map<string, Map<string, number>>} game ID -> player ID -> rating (players with a rating only).
 */
export function ratingsFromProfiles(profiles) {
  const ratings = new Map();
  for (const { playerId, games } of Object.values(profiles?.players ?? {})) {
    for (const { gameId, rating } of games ?? []) {
      if (rating == null) continue;
      if (!ratings.has(String(gameId))) ratings.set(String(gameId), new Map());
      ratings.get(String(gameId)).set(String(playerId), rating);
    }
  }
  return ratings;
}

/**
 * @param {object[]} events The tournament's events with their entrants (SEEDING_QUERY result).
 * @param {Map<string, Map<string, number>>} ratingsByGame Current Elo rating per game and player
 *   (ratingsFromProfiles, or `final.byGame` from computeRatings).
 * @returns {{ gameName: string, players: { seed: number, playerId: string|null, name: string,
 *   rating: number|null }[] }[]}
 *   Rated players by rating (ties by name), then players without a rating in start.gg's sign-up order.
 *   Players without a rating have no rated set in that game yet (newcomers, or hidden players).
 */
export function buildSeeding(events, ratingsByGame) {
  return (events ?? []).map((event) => {
    const ratings = ratingsByGame.get(String(event.videogame?.id)) ?? new Map();
    const entrants = (event.entrants?.nodes ?? []).map((entrant, order) => {
      const participant = entrant.participants?.[0];
      const id = getPlayerId(participant);
      const playerId = id == null ? null : String(id);
      return {
        playerId,
        name: formatDisplayName({
          prefix: participant?.prefix ?? '',
          gamerTag: participant?.gamerTag ?? entrant.name ?? 'Unknown',
          entrantName: entrant.name,
        }),
        rating: (playerId && ratings.get(playerId)) ?? null,
        order,
      };
    });

    const rated = entrants
      .filter((entrant) => entrant.rating != null)
      .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
    const unrated = entrants.filter((entrant) => entrant.rating == null);

    return {
      gameName: event.videogame?.name ?? event.name,
      players: [...rated, ...unrated].map(({ order, ...player }, index) => ({ seed: index + 1, ...player })),
    };
  });
}

/** One CSV field, quoted when it contains a comma, quote or line break. */
const csvField = (value) => {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** The seeding of every game as one CSV text: Game, Seed, Player, Rating, start.gg player ID. */
export function seedingToCsv(seeding) {
  const rows = [['Game', 'Seed', 'Player', 'Rating', 'start.gg player ID']];
  for (const game of seeding) {
    for (const player of game.players) {
      rows.push([game.gameName, player.seed, player.name, player.rating ?? '', player.playerId ?? '']);
    }
  }
  return `${rows.map((row) => row.map(csvField).join(',')).join('\n')}\n`;
}
