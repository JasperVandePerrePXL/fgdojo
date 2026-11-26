#!/usr/bin/env node
// Private seeding list for the next dojo. Run it on your own computer; nothing is published or committed.
// Usage: npm run seeding                      (the tournament the hub link https://start.gg/RBHubFGDojo points to)
//        npm run seeding -- <slug or start.gg tournament URL>
//
// `npm run seeding` first runs `npm run fetch`, so the ratings include the latest results. This script then
// downloads the live sign-ups, sorts each game by Elo rating (src/stats/seeding.js), prints the lists and saves
// them as seeding/<tournament>.csv (the seeding/ folder is in .gitignore).
import fs from 'node:fs/promises';
import path from 'node:path';
import { gql, getKey } from '../startgg/client.js';
import { SEEDING_QUERY } from '../startgg/queries.js';
import { findSlugFromHub } from '../next_event/hub.js';
import { normalizeTournamentSlug, listSeasons } from '../config/tournaments.js';
import { readRawEvents } from '../storage/raw_events.js';
import { onlyFinishedEvents } from '../stats/sets.js';
import { computeRatings } from '../stats/elo.js';
import { buildSeeding, seedingToCsv } from '../stats/seeding.js';
import { formatBrusselsDate } from '../lib/dates.js';
import { SEEDING_DIR } from '../lib/paths.js';
import { isMainModule, loadEnv } from '../lib/cli.js';

/** The tournament slug from the command line (slug or URL), else from the hub link. */
async function resolveSlug(argument) {
  if (argument) return normalizeTournamentSlug(argument);
  const slug = await findSlugFromHub();
  if (!slug)
    throw new Error('The hub link did not point to a tournament. Pass a slug: npm run seeding -- <slug>');
  return slug;
}

export async function main(argument = process.argv[2]) {
  await loadEnv();
  if (!getKey()) throw new Error('STARTGG_KEY is missing: add it to .env (see .env.example).');

  const slug = await resolveSlug(argument);
  const { tournament } = await gql(SEEDING_QUERY, { slug: `tournament/${slug}` });
  if (!tournament) throw new Error(`Tournament "${slug}" not found on start.gg.`);

  const rawEvents = onlyFinishedEvents(await readRawEvents());
  const { final } = computeRatings(
    listSeasons().map(({ id }) => ({ seasonId: Number(id), events: rawEvents[id] ?? [] })),
  );
  const seeding = buildSeeding(tournament.events, final.byGame);

  console.log(`\n🥋 Seeding for ${tournament.name} (${formatBrusselsDate(tournament.startAt)})`);
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
  console.log('  Players without a rating have no rated set in that game yet; seed them by hand.');
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`Seeding failed: ${error.message}`);
    process.exitCode = 1;
  });
}
