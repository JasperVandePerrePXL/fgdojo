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

const endpoint = 'https://api.start.gg/gql/alpha';

// Full event slugs (one per event). Add/remove as needed.
const EVENT_SLUGS = [
  // December 2025
  'tournament/fighting-game-dojo-december-25/event/1v1-fgdojo-street-fighter-6-pc',
  'tournament/fighting-game-dojo-december-25/event/1v1-fgdojo-tekken-8-ps5',

  // November 2025
  'tournament/fighting-game-dojo-november-25/event/1v1-fgdojo-street-fighter-6-pc',
  'tournament/fighting-game-dojo-november-25/event/1v1-fgdojo-tekken-8-ps5',

  // Anniversary (October 2025)
  'tournament/fighting-game-dojo-anniversary-evo-prep-weekend/event/1v1-fgdojo-street-fighter-6-pc',
  'tournament/fighting-game-dojo-anniversary-evo-prep-weekend/event/1v1-fgdojo-tekken-8-ps5',

  // Back To School (September 2025)
  'tournament/fighting-game-dojo-back-to-school/event/1v1-fgdojo-street-fighter-6-pc',
  'tournament/fighting-game-dojo-back-to-school/event/1v1-fgdojo-tekken-8-ps5',

  // Summer Part 2 (August 2025)
  'tournament/fighting-game-dojo-summer-part-2/event/1v1-fgdojo-street-fighter-6-pc',
  'tournament/fighting-game-dojo-summer-part-2/event/1v1-fgdojo-tekken-8-ps5',

  // Summer Edition (July 2025)
  'tournament/fighting-game-dojo-summer-edition/event/1v1-fgdojo-street-fighter-6-pc',
  'tournament/fighting-game-dojo-summer-edition/event/1v1-fgdojo-tekken-8-ps5',

  // Fifth Round (June 2025)
  'tournament/fighting-game-dojo-the-fifth-round/event/1v1-fgdojo-street-fighter-6',
  'tournament/fighting-game-dojo-the-fifth-round/event/1v1-fgdojo-tekken-8',

  // Fourth Round (May 2025)
  'tournament/fighting-game-dojo-the-fourth-round/event/1v1-fgdojo-street-fighter-6',
  'tournament/fighting-game-dojo-the-fourth-round/event/1v1-fgdojo-tekken-8',

  // Third Round (April 2025)
  'tournament/fighting-game-dojo-the-third-round-including-rb-kumite-view/event/1v1-fgdojo-street-fighter-6',
  'tournament/fighting-game-dojo-the-third-round-including-rb-kumite-view/event/1v1-fgdojo-tekken-8',

  // Second Round (March/February 2025)
  'tournament/fighting-game-dojo-the-second-round/event/1v1-fgdojo-street-fighter-6',
  'tournament/fighting-game-dojo-the-second-round/event/1v1-fgdojo-tekken-8',

  // First Round (January 2025)
  'tournament/fighting-game-dojo-the-first-round-frag-o-matic-invitational/event/1v1-sf6-frag-o-matic-invitational',
  'tournament/fighting-game-dojo-the-first-round-frag-o-matic-invitational/event/1v1-t8-frag-o-matic-invitational',
  
  'tournament/fighting-game-dojo-the-fourth-round/event/1v1-fgdojo-guilty-gear-strive',
  'tournament/fighting-game-dojo-the-fifth-round/event/1v1-fgdojo-guilty-gear-strive',
  'tournament/fighting-game-dojo-summer-edition/event/1v1-fgdojo-guilty-gear-strive-pc',
  'tournament/fighting-game-dojo-summer-part-2/event/1v1-fgdojo-guilty-gear-strive-pc',
  'tournament/fighting-game-dojo-back-to-school/event/1v1-fgdojo-guilty-gear-strive-pc',
  'tournament/fighting-game-dojo-anniversary-evo-prep-weekend/event/1v1-fgdojo-guilty-gear-strive-pc',
  'tournament/fighting-game-dojo-november-25/event/1v1-fgdojo-guilty-gear-strive-pc',
  'tournament/fighting-game-dojo-december-25/event/1v1-fgdojo-guilty-gear-strive-pc',
];

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
  console.log(`Fetching Guilty Gear Strive data from ${EVENT_SLUGS.length} event(s)...`);

  const results = [];

  for (const eventSlug of EVENT_SLUGS) {
    console.log(`Fetching: ${eventSlug}`);
    const event = await fetchEventData(eventSlug);
    if (event) {
      results.push(event);
      console.log(`  ✓ Fetched event: ${event.name} (${event.entrants?.pageInfo?.total ?? 0} entrants)`);
    } else {
      console.log(`  ✗ No GG Strive event found`);
    }
  }

  console.log(`\nTotal events fetched: ${results.length}`);

  // Write to output.json
  const outFile = 'output.json';
  try {
    await fs.writeFile(outFile, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Saved ${results.length} event(s) to ${outFile}`);
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
