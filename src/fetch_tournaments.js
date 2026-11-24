#!/usr/bin/env node
// Fetch Guilty Gear Strive event data from a list of event slugs.
// Usage: node src/fetch_tournaments.js

import { gql, getKey, readCache, writeCache } from './startgg.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { migrateLegacyData, readRawEvents, writeRawEvents } from './data_store.js';
import { TOURNAMENT_CONFIG, getTournamentGames, getGameEventCandidates } from './tournament_config.js';

// Attempt to load `.env` automatically if the `dotenv` package is installed.
try {
  await import('dotenv').then(d => d.config());
} catch (e) {
  // dotenv not installed — OK, environment variables can still be provided by the shell
}

export const eventQuery = `query EventData($slug: String!) {
  event(slug: $slug) {
    id
    name
    slug
    startAt
    videogame {
      id
      name
    }
    tournament {
      id
      name
      slug
      startAt
    }
    entrants(query: { perPage: 500 }) {
      pageInfo {
        total
        totalPages
      }
      nodes {
        id
        name
        standing {
          placement
        }
        participants {
          id
          gamerTag
          prefix
          player {
            id
            gamerTag
          }
        }
      }
    }
    standings(query: { perPage: 500 }) {
      pageInfo {
        total
      }
      nodes {
        placement
        entrant {
          id
          name
          participants {
            gamerTag
          }
        }
      }
    }
    sets(perPage: 500, page: 1) {
      pageInfo {
        total
      }
      nodes {
        id
        displayScore
        fullRoundText
        winnerId
        slots {
          entrant {
            id
            name
            participants {
              id
              gamerTag
              player {
                id
              }
            }
          }
          standing {
            stats {
              score {
                value
              }
            }
          }
        }
      }
    }
  }
}`;

const DAY = 86400000;
const FINAL_AFTER = 14 * DAY; // results older than this never change: cache forever
let failures = 0; // circuit breaker: stop hammering a dead API
async function fetchEvent(slug) {
  const cached = await readCache(slug);
  const age = cached?.data?.startAt ? Date.now() - cached.data.startAt * 1000 : 0;
  if (cached && age > FINAL_AFTER) return cached.data;
  if (failures >= 3) return cached?.data ?? null;
  try {
    const { event } = await gql(eventQuery, { slug }, { retries: failures ? 1 : 3 });
    if (event) { failures = 0; await writeCache(slug, event); return event; }
  } catch (err) {
    failures++;
    console.error(`  ✗ ${slug}: ${err.response?.errors?.[0]?.message ?? err.message}`);
  }
  return cached?.data ?? null; // graceful fallback to last known good
}

async function fetchEventCandidates(candidates) {
  for (const slug of candidates) {
    const event = await fetchEvent(slug);
    if (event) return event;
  }
  return null;
}

async function main() {
  const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  await migrateLegacyData(baseDir);
  if (!getKey()) {
    console.warn('⚠ No STARTGG_KEY set — keeping existing output files.');
    return;
  }
  const stored = await readRawEvents(baseDir);
  const allBySeason = { ...stored };
  const all = [];
  for (const [seasonId, season] of Object.entries(TOURNAMENT_CONFIG.seasons ?? {})) {
    const events = [];
    for (const tournament of season.tournaments ?? []) {
      for (const gameId of getTournamentGames(season, tournament)) {
        const candidates = getGameEventCandidates(tournament.slug, gameId);
        const ev = await fetchEventCandidates(candidates);
        if (ev) { events.push(ev); console.log(`  ✓ ${ev.name} (${ev.entrants?.pageInfo?.total ?? 0})`); }
      }
    }
    const previous = await readRawEvents(baseDir).then((data) => data[seasonId] ?? []);
    // Never replace good data with a worse (partial/empty) result.
    if (events.length < previous.length) {
      console.warn(`⚠ Season ${seasonId}: got ${events.length}/${previous.length} events — keeping previous data.`);
      allBySeason[seasonId] = previous;
      all.push(...previous);
      continue;
    }
    allBySeason[seasonId] = events;
    console.log(`✓ Season ${seasonId}: ${events.length} events`);
    all.push(...events);
  }
  await writeRawEvents(baseDir, allBySeason);
}

// Always exit 0: a flaky API must not block a deploy of the last known good data.
main().catch((e) => console.error('fetch failed, keeping existing data:', e.message));
