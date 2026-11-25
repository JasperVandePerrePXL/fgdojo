#!/usr/bin/env node
// Step 1 of the pipeline: download every configured event from start.gg into data/events.json.
// Usage: npm run fetch
//
// Safety rules (the site must never lose data because the API had a bad day):
//  - finished events (older than 14 days) are served from the cache and never re-downloaded;
//  - after 3 failures in a row the API is considered down and cached data is used;
//  - a season that came back with fewer events than before keeps its previous data;
//  - the script always exits 0 so a flaky API cannot block a deploy of the last known good data.
import { gql, getKey } from '../startgg/client.js';
import { readCache, writeCache } from '../startgg/cache.js';
import { EVENT_QUERY } from '../startgg/queries.js';
import { migrateLegacyData, readRawEvents, writeRawEvents } from '../storage/raw_events.js';
import { TOURNAMENT_CONFIG, getTournamentGames, getGameEventCandidates } from '../config/tournaments.js';
import { PROJECT_ROOT } from '../lib/paths.js';
import { isMainModule, loadEnv } from '../lib/cli.js';

const DAY_MS = 86_400_000;
/** Results older than this never change, so the cached copy is used without asking the API. */
const FINAL_AFTER_MS = 14 * DAY_MS;
/** Stop calling the API after this many consecutive failures. */
const MAX_CONSECUTIVE_FAILURES = 3;

let consecutiveFailures = 0;

/**
 * Fetches one event by its full slug (`tournament/<t>/event/<e>`).
 * @returns {Promise<object|null>} The event, the last cached copy when the API fails, or null.
 */
async function fetchEvent(slug) {
  const cached = await readCache(slug);
  const ageMs = cached?.data?.startAt ? Date.now() - cached.data.startAt * 1000 : 0;
  if (cached && ageMs > FINAL_AFTER_MS) return cached.data;
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return cached?.data ?? null;

  try {
    const { event } = await gql(EVENT_QUERY, { slug }, { retries: consecutiveFailures ? 1 : 3 });
    if (event) {
      consecutiveFailures = 0;
      await writeCache(slug, event);
      return event;
    }
  } catch (err) {
    consecutiveFailures++;
    console.error(`  ✗ ${slug}: ${err.response?.errors?.[0]?.message ?? err.message}`);
  }
  return cached?.data ?? null; // graceful fallback to the last known good copy
}

/** Tries the known event slug variants of one game in order and returns the first that exists. */
async function fetchFirstExistingEvent(candidateSlugs) {
  for (const slug of candidateSlugs) {
    const event = await fetchEvent(slug);
    if (event) return event;
  }
  return null;
}

/** Fetches all events of one season, one per tournament and game. */
async function fetchSeason(season) {
  const events = [];
  for (const tournament of season.tournaments ?? []) {
    for (const gameId of getTournamentGames(season, tournament)) {
      const event = await fetchFirstExistingEvent(getGameEventCandidates(tournament.slug, gameId));
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
  await migrateLegacyData(PROJECT_ROOT);

  if (!getKey()) {
    console.warn('⚠ No STARTGG_KEY set — keeping existing output files.');
    return;
  }

  const stored = await readRawEvents(PROJECT_ROOT);
  const eventsBySeason = { ...stored };

  for (const [seasonId, season] of Object.entries(TOURNAMENT_CONFIG.seasons ?? {})) {
    const events = await fetchSeason(season);
    const previous = stored[seasonId] ?? [];

    // Never replace good data with a worse (partial/empty) result.
    if (events.length < previous.length) {
      console.warn(`⚠ Season ${seasonId}: got ${events.length}/${previous.length} events — keeping previous data.`);
      continue;
    }
    eventsBySeason[seasonId] = events;
    console.log(`✓ Season ${seasonId}: ${events.length} events`);
  }

  await writeRawEvents(PROJECT_ROOT, eventsBySeason);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => console.error('fetch failed, keeping existing data:', error.message));
}
