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
import { LEADERBOARDS_FILE, PLAYERS_FILE, STATS_FILE } from '../lib/paths.js';
import { buildSiteStats } from '../stats/site_stats.js';
import { computeRatings } from '../stats/elo.js';
import { onlyFinishedEvents } from '../stats/sets.js';
import { buildPlayerProfiles } from '../stats/player_profiles.js';
import { isMainModule } from '../lib/cli.js';

/** Season ID used for the "All Seasons Combined" entry. */
const COMBINED_SEASON_ID = -1;

/** Builds the leaderboard of every configured season that has data. */
function buildSeasonLeaderboards(rawEvents, ratings) {
  const leaderboards = {};

  for (const { id, name } of listSeasons()) {
    console.log(`📅 ${name}:`);
    const events = rawEvents[id] ?? [];

    if (events.length === 0) {
      console.log(`  ⚠️  No tournament data found for ${name}`);
      continue;
    }

    console.log(`  Loading ${events.length} event(s)...`);
    const output = buildLeaderboardOutput({
      seasonId: parseInt(id, 10),
      seasonName: name,
      events,
      ratings: ratings.bySeason.get(Number(id)),
    });
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

/** Writes public/data/stats.json for the stats page (all tournaments of all seasons). */
async function writeSiteStats(rawEvents) {
  const stats = buildSiteStats(
    listSeasons().map(({ id, name }) => ({
      seasonId: Number(id),
      seasonName: name,
      events: rawEvents[id] ?? [],
    })),
  );
  await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
  console.log('✓ Saved stats page data to public/data/stats.json');
}

/** Writes public/data/players.json for the player pages. */
async function writePlayerProfiles(events, historyByGame) {
  const profiles = buildPlayerProfiles(events, historyByGame);
  await fs.writeFile(PLAYERS_FILE, JSON.stringify(profiles), 'utf8');
  console.log(`✓ Saved ${Object.keys(profiles.players).length} player pages to public/data/players.json`);
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

  // Upcoming dojos (registrations but no played sets yet) count nowhere until they have results.
  const rawEvents = onlyFinishedEvents(await readRawEvents());
  // Elo ratings run through every season in order, so each season shows the ratings at its end.
  const ratings = computeRatings(
    listSeasons().map(({ id }) => ({ seasonId: Number(id), events: rawEvents[id] ?? [] })),
  );
  const seasons = buildSeasonLeaderboards(rawEvents, ratings);

  const allEvents = collectAllEvents(rawEvents);
  if (allEvents.length > 0) {
    const combined = buildLeaderboardOutput({
      seasonId: COMBINED_SEASON_ID,
      seasonName: 'All Seasons Combined',
      events: allEvents,
      ratings: ratings.final,
    });
    console.log('✓ Processed combined leaderboard');
    await writeLeaderboards({ seasons, combined });
    await writeSiteStats(rawEvents);
    await writePlayerProfiles(allEvents, ratings.historyByGame);
  }

  // Season 0 is the only season whose fun stats are printed (kept from the original script).
  if (seasons[0]) printFunStats(seasons[0]);
}

if (isMainModule(import.meta.url)) {
  main().catch(console.error);
}
