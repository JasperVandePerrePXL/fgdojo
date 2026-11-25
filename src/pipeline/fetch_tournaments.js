#!/usr/bin/env node
// Step 1 of the pipeline: download every configured event from start.gg into data/events.json.
// Usage: npm run fetch
//
// The safety rules live in ./event_fetcher.js. This script wires them to the real start.gg client
// and cache, and always exits 0 so a flaky API cannot block a deploy of the last known good data.
import { gql, getKey } from '../startgg/client.js';
import { createFileCache } from '../startgg/cache.js';
import { EVENT_QUERY } from '../startgg/queries.js';
import { readRawEvents, writeRawEvents } from '../storage/raw_events.js';
import { TOURNAMENT_CONFIG, getTournamentGames, getGameEventCandidates } from '../config/tournaments.js';
import { isMainModule, loadEnv } from '../lib/cli.js';
import { createEventFetcher, mergeSeasonEvents } from './event_fetcher.js';

/** Downloads one event through the GraphQL client. */
async function requestEvent(slug, { retries }) {
  const { event } = await gql(EVENT_QUERY, { slug }, { retries });
  return event;
}

/** Fetches all events of one season, one per tournament and game. */
async function fetchSeason(season, fetcher) {
  const events = [];
  for (const tournament of season.tournaments ?? []) {
    for (const gameId of getTournamentGames(season, tournament)) {
      const event = await fetcher.fetchFirstExistingEvent(getGameEventCandidates(tournament.slug, gameId));
      if (event) {
        events.push(event);
        console.log(`  ✓ ${event.name} (${event.entrants?.pageInfo?.total ?? 0})`);
      }
    }
  }
  return events;
}

export async function main() {
  await loadEnv();

  if (!getKey()) {
    console.warn('⚠ No STARTGG_KEY set — keeping existing output files.');
    return;
  }

  const fetcher = createEventFetcher({ requestEvent, cache: createFileCache() });
  const stored = await readRawEvents();
  const eventsBySeason = { ...stored };

  for (const [seasonId, season] of Object.entries(TOURNAMENT_CONFIG.seasons ?? {})) {
    const previous = stored[seasonId] ?? [];
    const { events, keptPrevious } = mergeSeasonEvents(previous, await fetchSeason(season, fetcher));
    eventsBySeason[seasonId] = events;

    if (keptPrevious) console.warn(`⚠ Season ${seasonId}: got fewer events than the ${previous.length} stored — keeping previous data.`);
    else console.log(`✓ Season ${seasonId}: ${events.length} events`);
  }

  await writeRawEvents(eventsBySeason);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => console.error('fetch failed, keeping existing data:', error.message));
}
