// The next dojo as shown on the rankings page card and used by the seeding command.
// Pure function: the tournament comes from start.gg (src/pipeline/next_dojo.js) and the time is passed in.
import { formatBrusselsDate } from '../lib/dates.js';

/** `tournament/x` or `/tournament/x/event/y` -> full start.gg URL. */
const startggUrl = (slug) => `https://www.start.gg/${String(slug).replace(/^\/+/, '')}`;

/**
 * @param {object|null} tournament start.gg tournament (NEXT_DOJO_QUERY result).
 * @param {number} now Current Unix time in seconds.
 * @returns {import('./types.js').NextDojo|null} null without a tournament or when its day has passed.
 */
export function toNextDojo(tournament, now) {
  if (!tournament?.slug || !tournament.startAt) return null;
  const date = formatBrusselsDate(tournament.startAt);
  if (date < formatBrusselsDate(now)) return null;

  return {
    name: tournament.name ?? 'Fighting Game Dojo',
    url: startggUrl(tournament.slug),
    date,
    games: (tournament.events ?? []).map((event) => ({
      gameName: event.videogame?.name ?? event.name,
      entrants: event.entrants?.pageInfo?.total ?? 0,
      url: event.slug ? startggUrl(event.slug) : startggUrl(tournament.slug),
    })),
  };
}
