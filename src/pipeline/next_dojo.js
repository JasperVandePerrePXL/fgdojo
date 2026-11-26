#!/usr/bin/env node
// Looks up the next dojo on start.gg and writes public/data/next-dojo.json for the rankings page card.
// Usage: npm run next-dojo   (the next-dojo workflow runs it every 30 minutes and uploads the file when it changed)
//
//  1. The hub link https://start.gg/RBHubFGDojo points to the current tournament (no API key needed);
//     when it cannot be read, the earliest upcoming "Fighting Game Dojo" tournament is searched by name.
//  2. One API call gets its name, date and sign-ups per game (toNextDojo in src/stats/next_dojo.js).
//  3. A tournament whose day has passed is not "next": the file then says `{ "nextDojo": null }`.
// On an error (or without STARTGG_KEY) the existing file is kept and the exit code is 1, so the workflow
// stops before uploading anything.
import fs from 'node:fs/promises';
import path from 'node:path';
import { gql, getKey } from '../startgg/client.js';
import { NEXT_DOJO_QUERY } from '../startgg/queries.js';
import { findSlugFromHub } from '../next_event/hub.js';
import { findUpcomingTournamentByName } from '../next_event/lookup.js';
import { normalizeTournamentSlug } from '../config/tournaments.js';
import { toNextDojo } from '../stats/next_dojo.js';
import { NEXT_DOJO_FILE } from '../lib/paths.js';
import { isMainModule, loadEnv } from '../lib/cli.js';

/** The slug of the tournament the hub points to, else of the earliest upcoming dojo found by name. */
async function currentTournamentSlug() {
  try {
    const slug = await findSlugFromHub();
    if (slug) return slug;
  } catch (error) {
    console.warn(`  Hub lookup failed (${error.message}); searching by name.`);
  }
  const found = await findUpcomingTournamentByName();
  return found ? normalizeTournamentSlug(found.slug) : null;
}

/**
 * The next dojo from start.gg (needs STARTGG_KEY).
 * @returns {Promise<import('../stats/types.js').NextDojo|null>}
 */
export async function lookupNextDojo(now = Math.floor(Date.now() / 1000)) {
  const slug = await currentTournamentSlug();
  if (!slug) return null;
  const { tournament } = await gql(NEXT_DOJO_QUERY, { slug: `tournament/${slug}` });
  return toNextDojo(tournament, now);
}

export async function main() {
  await loadEnv();
  if (!getKey()) {
    console.error('✗ No STARTGG_KEY set — next-dojo.json not updated.');
    process.exitCode = 1;
    return;
  }
  try {
    const nextDojo = await lookupNextDojo();
    await fs.mkdir(path.dirname(NEXT_DOJO_FILE), { recursive: true });
    // No timestamp in the file: it only changes (and is only re-uploaded) when the dojo or a sign-up count changes.
    await fs.writeFile(NEXT_DOJO_FILE, `${JSON.stringify({ nextDojo }, null, 2)}\n`, 'utf8');
    console.log(
      nextDojo
        ? `✓ Next dojo: ${nextDojo.name} (${nextDojo.date}), ${nextDojo.games.map((g) => `${g.gameName} ${g.entrants}`).join(', ')}`
        : '✓ No next dojo on start.gg yet',
    );
  } catch (error) {
    console.error(`✗ Next dojo lookup failed, next-dojo.json not updated: ${error.message}`);
    process.exitCode = 1;
  }
}

if (isMainModule(import.meta.url)) {
  main();
}
