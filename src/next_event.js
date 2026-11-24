#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gql, getKey } from './startgg.js';

try {
  await import('dotenv').then((dotenv) => dotenv.config());
} catch {}

const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const configFile = path.join(baseDir, 'data', 'tournament_slugs.json');

export function getBelgiumDateParts(timestamp) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(timestamp * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month) };
}

export function seasonIdForTimestamp(timestamp) {
  const { year } = getBelgiumDateParts(timestamp);
  return year - 2025;
}

export function formatTournamentEntry(timestamp, slug) {
  const { year, month } = getBelgiumDateParts(timestamp);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return {
    name: `${monthNames[month - 1]} '${String(year).slice(-2)} edition`,
    slug,
  };
}

export function normalizeTournamentSlug(input) {
  const value = String(input ?? '').replace(/[^a-zA-Z0-9/-]/g, '').replace(/\/$/, '');
  const match = value.match(/(?:^|\/)tournament\/([^/]+)(?:\/|$)/);
  return match ? match[1] : value.replace(/^\/?/, '');
}

export function updateNextEventConfig(config, tournament) {
  if (!tournament?.slug || !tournament?.startAt) return { config, changed: false };

  const slug = normalizeTournamentSlug(tournament.slug);
  if (!slug) return { config, changed: false };

  const nextConfig = structuredClone(config);
  const seasonId = String(seasonIdForTimestamp(tournament.startAt));
  nextConfig.nextEventUrl = `https://www.start.gg/tournament/${slug}`;

  if (!nextConfig.seasons[seasonId]) {
    nextConfig.seasons[seasonId] = {
      name: `Season ${seasonId}`,
      tournaments: [],
    };
  }

  const tournaments = nextConfig.seasons[seasonId].tournaments;
  if (!tournaments.some((entry) => normalizeTournamentSlug(entry.slug) === slug)) {
    tournaments.push(formatTournamentEntry(tournament.startAt, slug));
  }

  return {
    config: nextConfig,
    changed: JSON.stringify(nextConfig) !== JSON.stringify(config),
  };
}

async function findNextTournament() {
  const query = `query($page: Int!) {
    tournaments(query: { perPage: 100, page: $page, sortBy: "startAt asc", filter: { name: "Fighting Game Dojo" } }) {
      pageInfo { totalPages }
      nodes { name slug startAt }
    }
  }`;

  const now = Math.floor(Date.now() / 1000);
  let result = null;

  for (let page = 1; page <= 10; page++) {
    const response = await gql(query, { page });
    for (const tournament of response.tournaments?.nodes ?? []) {
      if (tournament.startAt > now && /fighting\s*game\s*dojo|fgdojo/i.test(tournament.name ?? '')) {
        if (!result || tournament.startAt < result.startAt) result = tournament;
      }
    }
    if (page >= response.tournaments?.pageInfo?.totalPages) break;
  }

  return result;
}

async function main() {
  if (!getKey()) {
    console.log('No STARTGG_KEY set; skipping next-event discovery.');
    return;
  }

  const current = JSON.parse(await fs.readFile(configFile, 'utf8'));
  const tournament = await findNextTournament();
  if (!tournament) {
    console.log('No upcoming Fighting Game Dojo tournament found.');
    return;
  }

  const result = updateNextEventConfig(current, tournament);
  if (!result.changed) {
    console.log(`Next event is already configured: ${normalizeTournamentSlug(tournament.slug)}`);
    return;
  }

  await fs.writeFile(configFile, `${JSON.stringify(result.config, null, 2)}\n`);
  console.log(`Updated next event: ${normalizeTournamentSlug(tournament.slug)} (${new Date(tournament.startAt * 1000).toISOString()})`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`Next-event discovery failed: ${error.message}`);
    process.exitCode = 0;
  });
}
