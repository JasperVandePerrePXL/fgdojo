#!/usr/bin/env node
// Private seeding list for the next dojo. Run it on your own computer; nothing is published or committed.
// Usage: npm run seeding
//
// `npm run seeding` first runs `npm run fetch`, so the ratings and the list of dojos are up to date. This script
// then looks up the next dojo on start.gg (lookupNextDojo, the same dojo as the "Next dojo" card on the site),
// downloads its live sign-ups, sorts each game by Elo rating (src/stats/seeding.js), prints the lists and saves
// them as seeding/<tournament>.csv (the seeding/ folder is in .gitignore).
import fs from 'node:fs/promises';
import path from 'node:path';
import { gql, getKey } from '../startgg/client.js';
import { SEEDING_QUERY } from '../startgg/queries.js';
import { normalizeTournamentSlug, listSeasons } from '../config/tournaments.js';
import { readRawEvents } from '../storage/raw_events.js';
import { onlyFinishedEvents } from '../stats/sets.js';
import { computeRatings } from '../stats/elo.js';
import { lookupNextDojo } from '../pipeline/next_dojo.js';
import { buildSeeding, seedingToCsv } from '../stats/seeding.js';
import { formatBrusselsDate } from '../lib/dates.js';
import { SEEDING_DIR } from '../lib/paths.js';
import { isMainModule, loadEnv } from '../lib/cli.js';

export async function main() {
  await loadEnv();
  if (!getKey()) throw new Error('STARTGG_KEY is missing: add it to .env (see .env.example).');

  const upcoming = await lookupNextDojo();
  if (!upcoming) {
    console.log(
      '\n⚠ There is no next dojo yet: the last dojo has been played and start.gg has no new one.\n' +
        '  Run this again once the next dojo is on start.gg (the hub link points to it).',
    );
    return;
  }

  const slug = normalizeTournamentSlug(upcoming.url);
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
