// start.gg API lookups for the next-event script (an API key is required).
import { gql } from '../startgg/client.js';
import { TOURNAMENT_QUERY, TOURNAMENTS_BY_NAME_QUERY } from '../startgg/queries.js';

const MAX_PAGES = 10;
const NAME_PATTERN = /fighting\s*game\s*dojo|fgdojo/i;

/**
 * Looks up a tournament by its bare slug.
 * @returns {Promise<{ name: string, slug: string, startAt: number }|null>}
 */
export async function fetchTournament(slug) {
  const data = await gql(TOURNAMENT_QUERY, { slug: `tournament/${slug}` });
  return data.tournament;
}

/**
 * Fallback when the hub link cannot be read: the earliest future tournament whose name matches.
 * @returns {Promise<{ name: string, slug: string, startAt: number }|null>}
 */
export async function findUpcomingTournamentByName() {
  const now = Math.floor(Date.now() / 1000);
  let earliest = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { tournaments } = await gql(TOURNAMENTS_BY_NAME_QUERY, { page });
    for (const tournament of tournaments?.nodes ?? []) {
      const isUpcoming = tournament.startAt > now;
      if (isUpcoming && NAME_PATTERN.test(tournament.name ?? '')) {
        if (!earliest || tournament.startAt < earliest.startAt) earliest = tournament;
      }
    }
    if (page >= tournaments?.pageInfo?.totalPages) break;
  }

  return earliest;
}
