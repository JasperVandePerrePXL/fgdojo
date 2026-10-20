#!/usr/bin/env node
// Fetch Guilty Gear Strive event data from a list of event slugs.
// Usage: node src/fetch_tournaments.js

import { gql, getKey, readCache, writeCache, discoverEventSlugs } from './startgg.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { SEASONS } from './seasons.js';

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
const eventsInSeason = (s) => Object.values(SEASONS[s].tournaments).flat();
// New editions are placed in a season by date (Season 1 starts 2026-01-01).
const seasonFor = (startAt) => (startAt * 1000 < Date.UTC(2026, 0, 1) ? 0 : 1);

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

async function main() {
  const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  if (!getKey()) {
    console.warn('⚠ No STARTGG_KEY set — keeping existing output files.');
    return;
  }
  const slugs = Object.fromEntries(Object.keys(SEASONS).map((s) => [s, new Set(eventsInSeason(s))]));
  try {
    for (const e of await discoverEventSlugs()) slugs[seasonFor(e.startAt)]?.add(e.slug);
  } catch (err) {
    console.warn(`⚠ Discovery failed (${err.message}); using slugs from seasons.js only.`);
    failures = 3; // API looks unreachable: serve everything from cache / previous files
  }

  const all = [];
  for (const [seasonId, set] of Object.entries(slugs)) {
    const events = [];
    for (const slug of set) {
      const ev = await fetchEvent(slug);
      if (ev) { events.push(ev); console.log(`  ✓ ${ev.name} (${ev.entrants?.pageInfo?.total ?? 0})`); }
    }
    const file = path.join(baseDir, `output_season_${seasonId}.json`);
    let previous = [];
    try { previous = JSON.parse(await fs.readFile(file, 'utf8')); } catch {}
    // Never replace good data with a worse (partial/empty) result.
    if (events.length < previous.length) {
      console.warn(`⚠ Season ${seasonId}: got ${events.length}/${previous.length} events — keeping previous file.`);
      all.push(...previous);
      continue;
    }
    await fs.writeFile(file, JSON.stringify(events, null, 2));
    console.log(`✓ Season ${seasonId}: ${events.length} events`);
    all.push(...events);
  }
  await fs.writeFile(path.join(baseDir, 'output.json'), JSON.stringify(all, null, 2));
}

// Always exit 0: a flaky API must not block a deploy of the last known good data.
main().catch((e) => console.error('fetch failed, keeping existing data:', e.message));
