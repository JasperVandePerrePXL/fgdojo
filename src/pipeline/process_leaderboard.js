#!/usr/bin/env node
// Step 2 of the pipeline: calculate all statistics from data/events.json and write
// public/data/leaderboards.json, the single file the website loads.
// Usage: npm run process
import fs from 'node:fs/promises';
import path from 'node:path';
import { TOURNAMENT_CONFIG, listSeasons } from '../config/tournaments.js';
import { readRawEvents } from '../storage/raw_events.js';
import { buildLeaderboardOutput } from '../stats/season_output.js';
import { HIGHLIGHTS } from '../../shared/highlights.js';
import { LEADERBOARDS_FILE } from '../lib/paths.js';
import { isMainModule } from '../lib/cli.js';

/** Season ID used for the "All Seasons Combined" entry. */
const COMBINED_SEASON_ID = -1;

/** Builds the leaderboard of every configured season that has data. */
function buildSeasonLeaderboards(rawEvents) {
  const leaderboards = {};

  for (const { id, name } of listSeasons()) {
    console.log(`📅 ${name}:`);
    const events = rawEvents[id] ?? [];

    if (events.length === 0) {
      console.log(`  ⚠️  No tournament data found for ${name}`);
      continue;
    }

    console.log(`  Loading ${events.length} event(s)...`);
    const output = buildLeaderboardOutput({ seasonId: parseInt(id, 10), seasonName: name, events });
    console.log(
      `  Found ${output.summary.totalPlayers} unique player(s) across ${output.summary.totalDojos} dojo(s)`,
    );

    leaderboards[id] = output;
    console.log(`  ✓ Processed ${name}\n`);
  }

  return leaderboards;
}

/** Events of every season, for the combined leaderboard. */
function collectAllEvents(rawEvents) {
  return Object.values(rawEvents).flat();
}

async function writeLeaderboards({ seasons, combined }) {
  await fs.mkdir(path.dirname(LEADERBOARDS_FILE), { recursive: true });
  await fs.writeFile(
    LEADERBOARDS_FILE,
    JSON.stringify({ nextEventUrl: TOURNAMENT_CONFIG.nextEventUrl, seasons, combined }, null, 2),
    'utf8',
  );
  console.log('✓ Saved consolidated public data to public/data/leaderboards.json');
}

/** Prints the highlight lists and tournament winners of a season to the console. */
function printFunStats(output) {
  console.log(`\n=== ${output.seasonName} - FUN STATS ===`);

  for (const { id, label, valueKey, suffix } of HIGHLIGHTS) {
    console.log(`\n${label}:`);
    output.funStats[id].forEach((player, i) => {
      console.log(`  ${i + 1}. ${player.displayName} - ${player[valueKey]}${suffix}`);
    });
  }

  console.log('\nTournament winners:');
  output.tournaments.forEach((t) => {
    console.log(`  ${t.date} - ${t.name}: ${t.winner ?? 'Unknown'}`);
  });
}

export async function main() {
  console.log('🎮 Processing leaderboards by season...\n');

  const rawEvents = await readRawEvents();
  const seasons = buildSeasonLeaderboards(rawEvents);

  const allEvents = collectAllEvents(rawEvents);
  if (allEvents.length > 0) {
    const combined = buildLeaderboardOutput({
      seasonId: COMBINED_SEASON_ID,
      seasonName: 'All Seasons Combined',
      events: allEvents,
    });
    console.log('✓ Processed combined leaderboard');
    await writeLeaderboards({ seasons, combined });
  }

  // Season 0 is the only season whose fun stats are printed (kept from the original script).
  if (seasons[0]) printFunStats(seasons[0]);
}

if (isMainModule(import.meta.url)) {
  main().catch(console.error);
}
