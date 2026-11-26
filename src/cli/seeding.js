#!/usr/bin/env node
// Private seeding list for the next dojo. Run it on your own computer; nothing is published or committed.
// Usage: npm run seeding
//
// It reuses what the website already publishes and asks start.gg only for the sign-ups (1 API call):
//  1. https://fgdojo.stek.world/data/next-dojo.json -> which dojo is next (the same dojo as the card);
//  2. https://fgdojo.stek.world/data/players.json   -> every player's current rating per game (as in the ranking);
//  3. start.gg -> the live sign-ups of that dojo, per game;
// then sorts each game by rating (src/stats/seeding.js), prints the lists and saves seeding/<tournament>.csv
// (the seeding/ folder is in .gitignore).
import fs from 'node:fs/promises';
import path from 'node:path';
import { gql, getKey } from '../startgg/client.js';
import { SEEDING_QUERY } from '../startgg/queries.js';
import { normalizeTournamentSlug } from '../config/tournaments.js';
import { SITE_URL } from '../config/site.js';
import { buildSeeding, ratingsFromProfiles, seedingToCsv } from '../stats/seeding.js';
import { SEEDING_DIR } from '../lib/paths.js';
import { isMainModule, loadEnv } from '../lib/cli.js';

/** One JSON data file of the live website. */
async function readSiteJson(file) {
  const response = await fetch(new URL(`/data/${file}`, SITE_URL), { cache: 'no-store' });
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || !type.includes('json')) {
    throw new Error(`could not read ${SITE_URL}/data/${file} (HTTP ${response.status})`);
  }
  return response.json();
}

export async function main() {
  await loadEnv();
  if (!getKey()) throw new Error('STARTGG_KEY is missing: add it to .env (see .env.example).');

  const [{ nextDojo }, profiles] = await Promise.all([
    readSiteJson('next-dojo.json'),
    readSiteJson('players.json'),
  ]);
  if (!nextDojo) {
    console.log(
      '\n⚠ There is no next dojo yet: the last dojo has been played and start.gg has no new one.\n' +
        '  Run this again once the next dojo is on start.gg (the site shows it within 30 minutes).',
    );
    return;
  }

  const slug = normalizeTournamentSlug(nextDojo.url);
  const { tournament } = await gql(SEEDING_QUERY, { slug: `tournament/${slug}` });
  if (!tournament) throw new Error(`Tournament "${slug}" not found on start.gg.`);
  const seeding = buildSeeding(tournament.events, ratingsFromProfiles(profiles));

  console.log(`\n🥋 Seeding for ${tournament.name} (${nextDojo.date})`);
  for (const game of seeding) {
    console.log(`\n${game.gameName} (${game.players.length} signed up)`);
    for (const player of game.players) {
      console.log(
        `  ${String(player.seed).padStart(2)}. ${player.name}  ${player.rating ?? 'no rating yet'}`,
      );
    }
  }

  await fs.mkdir(SEEDING_DIR, { recursive: true });
  const file = path.join(SEEDING_DIR, `${slug}.csv`);
  await fs.writeFile(file, seedingToCsv(seeding), 'utf8');
  console.log(`\n✓ Saved ${path.relative(process.cwd(), file)} (not committed: seeding/ is in .gitignore)`);
  console.log('  Ratings are those on the website (updated after each dojo).');
  console.log('  Players without a rating have no rated set in that game yet; seed them by hand.');
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`Seeding failed: ${error.message}`);
    process.exitCode = 1;
  });
}
