#!/usr/bin/env node
// Fetch Guilty Gear Strive event data from a list of event slugs.
// Usage: node fetch_tournaments_by_game_year.js

import { request } from 'graphql-request';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

// Attempt to load `.env` automatically if the `dotenv` package is installed.
try {
  await import('dotenv').then(d => d.config());
} catch (e) {
  // dotenv not installed — OK, environment variables can still be provided by the shell
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const endpoint = 'https://api.start.gg/gql/alpha';

// Load event slugs from a season file (relative to project root)
async function loadSeasonSlugs(season = '0') {
  const seasonFile = path.join(__dirname, '..', 'seasons', `season-${season}.txt`);
  try {
    const content = await fs.readFile(seasonFile, 'utf8');
    const slugs = content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    return slugs;
  } catch (err) {
    console.error(`Error reading season file ${seasonFile}:`, err.message);
    return [];
  }
}

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
  // Get season from command line argument (default to 0)
  const season = process.argv[2] || '0';
  console.log(`\n🎮 Fetching data for Season ${season}...\n`);

  const EVENT_SLUGS = await loadSeasonSlugs(season);
  if (EVENT_SLUGS.length === 0) {
    console.error(`No slugs found for season ${season}. Make sure seasons/season-${season}.txt exists.`);
    process.exit(1);
  }

  console.log(`Fetching data from ${EVENT_SLUGS.length} event(s)...`);

  const results = [];

  for (const eventSlug of EVENT_SLUGS) {
    console.log(`Fetching: ${eventSlug}`);
    const event = await fetchEventData(eventSlug);
    if (event) {
      results.push(event);
      console.log(`  ✓ Fetched event: ${event.name} (${event.entrants?.pageInfo?.total ?? 0} entrants)`);
    } else {
      console.log(`  ✗ No event found`);
    }
  }

  console.log(`\nTotal events fetched: ${results.length}`);

  // Write to season-specific output file in data folder
  const dataDir = path.join(__dirname, '..', 'data');
  await fs.mkdir(dataDir, { recursive: true });
  const outFile = path.join(dataDir, `output-season-${season}.json`);
  try {
    await fs.writeFile(outFile, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Saved ${results.length} event(s) to data/output-season-${season}.json`);
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
