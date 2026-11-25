#!/usr/bin/env node
// Finds the latest Fighting Game Dojo tournament and makes sure it is in data/tournament_slugs.json.
// Usage: npm run next-event   (run by .github/workflows/update-next-event.yml on Sundays and Mondays)
//
//  1. Follow the hub link (https://start.gg/RBHubFGDojo) to get the current tournament slug.
//  2. Look up its start date through the API (needs STARTGG_KEY).
//  3. Report whether it is already listed; if not, add it to the right season and set `nextEventUrl`.
// Without a hub result the script falls back to searching start.gg by tournament name.
// Failures exit with code 1 so the GitHub workflow turns red instead of silently doing nothing.
import fs from 'node:fs/promises';
import { getKey } from '../startgg/client.js';
import { TOURNAMENT_SLUGS_FILE } from '../lib/paths.js';
import { isMainModule, loadEnv } from '../lib/cli.js';
import { normalizeTournamentSlug } from '../config/tournaments.js';
import { HUB_URL, findSlugFromHub } from './hub.js';
import { fetchTournament, findUpcomingTournamentByName } from './lookup.js';
import {
  findExistingTournament,
  seasonIdForTimestamp,
  updateNextEventConfig,
} from './config_update.js';

/** Logs a message and, in GitHub Actions, also shows it on the run's summary page. */
async function report(message) {
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${message}\n\n`);
  }
}

async function readSlugFromHub() {
  try {
    const slug = await findSlugFromHub();
    if (slug) console.log(`Hub ${HUB_URL} points to: ${slug}`);
    else console.warn('Could not read a tournament from the hub link; falling back to name search.');
    return slug;
  } catch (error) {
    console.warn(`Hub lookup failed: ${error.message}`);
    return null;
  }
}

export async function main() {
  await loadEnv();
  const current = JSON.parse(await fs.readFile(TOURNAMENT_SLUGS_FILE, 'utf8'));
  const slug = await readSlugFromHub();

  if (!getKey()) {
    if (slug && findExistingTournament(current, slug)) {
      await report(`Latest event \`${slug}\` is already in tournament_slugs.json.`);
      return;
    }
    throw new Error(slug
      ? `Hub points to new tournament "${slug}" but STARTGG_KEY is missing, so its date/season cannot be determined.`
      : 'Hub lookup failed and STARTGG_KEY is missing.');
  }

  const tournament = slug ? await fetchTournament(slug) : await findUpcomingTournamentByName();
  if (!tournament) {
    throw new Error('No Fighting Game Dojo tournament found (hub and name search both came up empty).');
  }

  const found = normalizeTournamentSlug(tournament.slug);
  const alreadyListed = Boolean(findExistingTournament(current, found));
  const result = updateNextEventConfig(current, tournament);
  const startsAt = new Date(tournament.startAt * 1000).toISOString();

  if (!result.changed) {
    await report(`Latest event \`${found}\` (${startsAt}) is already in tournament_slugs.json. Nothing to do.`);
    return;
  }

  await fs.writeFile(TOURNAMENT_SLUGS_FILE, `${JSON.stringify(result.config, null, 2)}\n`);
  await report(alreadyListed
    ? `Latest event \`${found}\` was already listed; updated nextEventUrl.`
    : `New event \`${found}\` (${startsAt}) was NOT in tournament_slugs.json: added it to Season ${seasonIdForTimestamp(tournament.startAt)} and set nextEventUrl.`);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`Next-event discovery failed: ${error.message}`);
    process.exitCode = 1;
  });
}
