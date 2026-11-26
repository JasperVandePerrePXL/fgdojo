// The next dojo for the "Next dojo" card on the rankings page: the earliest configured tournament
// that has no played set yet and has not started before today (Brussels time).
// Pure function: the current time is passed in.
import { formatBrusselsDate } from '../lib/dates.js';
import { isFinishedEvent } from './sets.js';

/**
 * @param {object[]} events Raw start.gg events of every season, including unplayed ones (as in data/events.json).
 * @param {number} now Current Unix time in seconds.
 * @returns {import('./types.js').UpcomingDojo|null} null when there is no upcoming, unplayed dojo.
 */
export function findUpcomingDojo(events, now) {
  const today = formatBrusselsDate(now);
  const dojos = new Map(); // tournament slug -> events of that tournament, in stored (config) order

  for (const event of events) {
    const slug = event.tournament?.slug;
    if (!slug) continue;
    if (!dojos.has(slug)) dojos.set(slug, []);
    dojos.get(slug).push(event);
  }

  const upcoming = [...dojos.values()]
    .filter((dojoEvents) => !dojoEvents.some(isFinishedEvent))
    .filter((dojoEvents) => (formatBrusselsDate(dojoEvents[0].tournament.startAt) ?? '') >= today)
    .sort((a, b) => a[0].tournament.startAt - b[0].tournament.startAt)[0];
  if (!upcoming) return null;

  const { tournament } = upcoming[0];
  return {
    name: tournament.name ?? 'Fighting Game Dojo',
    // Stored slugs already start with "tournament/".
    url: `https://www.start.gg/${tournament.slug.replace(/^\/+/, '')}`,
    date: formatBrusselsDate(tournament.startAt),
    games: upcoming.map((event) => ({
      gameName: event.videogame?.name ?? event.name,
      entrants: event.entrants?.pageInfo?.total ?? 0,
    })),
  };
}
