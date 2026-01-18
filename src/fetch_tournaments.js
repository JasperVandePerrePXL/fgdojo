#!/usr/bin/env node
// Fetch Guilty Gear Strive event data from a list of event slugs.
// Usage: node src/fetch_tournaments.js

import { request } from 'graphql-request';
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

const endpoint = 'https://api.start.gg/gql/alpha';

const eventQuery = `query EventData($slug: String!) {
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

async function fetchEventData(slug) {
  if (!process.env.STARTGG_KEY) {
    throw new Error('Please set STARTGG_KEY environment variable with your start.gg API key');
  }

  const headers = { Authorization: `Bearer ${process.env.STARTGG_KEY}` };

  try {
    const data = await request(endpoint, eventQuery, { slug }, headers);
    return data.event;
  } catch (err) {
    console.error(`Error fetching ${slug}:`, err.response?.errors ?? err.message ?? err);
    return null;
  }
}

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  
  // Collect results for each season
  const seasonResults = {};

  for (const [seasonId, seasonData] of Object.entries(SEASONS)) {
    console.log(`\n📅 Fetching ${seasonData.name}...`);
    const seasonEvents = [];
    let totalCount = 0;

    for (const [tourney, slugs] of Object.entries(seasonData.tournaments)) {
      console.log(`\n  🏆 ${tourney}:`);
      
      for (const eventSlug of slugs) {
        const event = await fetchEventData(eventSlug);
        if (event) {
          seasonEvents.push(event);
          const entrants = event.entrants?.pageInfo?.total ?? 0;
          totalCount += entrants;
          console.log(`    ✓ ${event.name} (${entrants} entrants)`);
        } else {
          console.log(`    ✗ Failed to fetch`);
        }
      }
    }

    seasonResults[seasonId] = seasonEvents;
    console.log(`\n  Total for ${seasonData.name}: ${seasonEvents.length} events`);
  }

  // Write separate output files for each season
  const baseDir = path.join(__dirname, '..');
  for (const [seasonId, events] of Object.entries(seasonResults)) {
    const seasonName = SEASONS[seasonId].name.toLowerCase().replace(/\s+/g, '_');
    const outFile = path.join(baseDir, `output_season_${seasonId}.json`);
    try {
      await fs.writeFile(outFile, JSON.stringify(events, null, 2), 'utf8');
      console.log(`✓ Saved ${events.length} event(s) to output_season_${seasonId}.json`);
    } catch (e) {
      console.error('Failed to write output file:', e.message ?? e);
    }
  }

  // Also keep a combined output file for backwards compatibility
  const allEvents = Object.values(seasonResults).flat();
  const outFile = path.join(baseDir, 'output.json');
  try {
    await fs.writeFile(outFile, JSON.stringify(allEvents, null, 2), 'utf8');
    console.log(`✓ Saved ${allEvents.length} total event(s) to output.json (all seasons)`);
  } catch (e) {
    console.error('Failed to write output file:', e.message ?? e);
  }
}

// If this file is executed directly (not imported), run `main()`.
const __filename = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (!invoked || path.resolve(__filename) === invoked) {
  main();
}
