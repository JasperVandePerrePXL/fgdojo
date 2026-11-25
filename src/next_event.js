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
const HUB_URL = 'https://start.gg/RBHubFGDojo';

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

export function extractTournamentSlug(value) {
  const match = String(value ?? '').match(/start\.gg\/tournament\/([a-zA-Z0-9-]+)/i);
  return match ? match[1] : null;
}

export function normalizeTournamentSlug(input) {
  const value = String(input ?? '').replace(/[^a-zA-Z0-9/-]/g, '').replace(/\/$/, '');
  const match = value.match(/(?:^|\/)tournament\/([^/]+)(?:\/|$)/);
  return match ? match[1] : value.replace(/^\/?/, '');
}

export function findExistingTournament(config, slug) {
  for (const season of Object.values(config.seasons ?? {})) {
    for (const tournament of season.tournaments ?? []) {
      if (normalizeTournamentSlug(tournament.slug) === slug) return tournament;
    }
  }
  return null;
}

export function updateNextEventConfig(config, tournament) {
  if (!tournament?.slug || !tournament?.startAt) return { config, changed: false };

  const slug = normalizeTournamentSlug(tournament.slug);
  if (!slug) return { config, changed: false };

  const nextConfig = structuredClone(config);
  const seasonId = String(seasonIdForTimestamp(tournament.startAt));
  nextConfig.nextEventUrl = `https://www.start.gg/tournament/${slug}`;

  if (findExistingTournament(nextConfig, slug)) {
    return {
      config: nextConfig,
      changed: JSON.stringify(nextConfig) !== JSON.stringify(config),
    };
  }

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

// The hub short link redirects to the page of the current Fighting Game Dojo tournament.
async function findSlugFromHub() {
  const response = await fetch(HUB_URL, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; fgdojo-next-event/1.0)' },
  });

  const fromUrl = extractTournamentSlug(response.url);
  if (fromUrl) return fromUrl;

  const html = await response.text();
  const link = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0] ?? '';
  const href = link.match(/href=["']([^"']+)["']/i)?.[1];
  return extractTournamentSlug(href);
}

async function fetchTournament(slug) {
  const data = await gql(
    `query($slug: String!) { tournament(slug: $slug) { name slug startAt } }`,
    { slug: `tournament/${slug}` },
  );
  return data.tournament;
}

// Fallback when the hub link cannot be resolved: search by name.
async function findUpcomingByName() {
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

async function report(message) {
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${message}\n\n`);
  }
}

async function main() {
  const current = JSON.parse(await fs.readFile(configFile, 'utf8'));

  let slug = null;
  try {
    slug = await findSlugFromHub();
  } catch (error) {
    console.warn(`Hub lookup failed: ${error.message}`);
  }
  if (slug) console.log(`Hub ${HUB_URL} points to: ${slug}`);
  else console.warn('Could not read a tournament from the hub link; falling back to name search.');

  if (!getKey()) {
    if (slug && findExistingTournament(current, slug)) {
      await report(`Latest event \`${slug}\` is already in tournament_slugs.json.`);
      return;
    }
    throw new Error(slug
      ? `Hub points to new tournament "${slug}" but STARTGG_KEY is missing, so its date/season cannot be determined.`
      : 'Hub lookup failed and STARTGG_KEY is missing.');
  }

  const tournament = slug ? await fetchTournament(slug) : await findUpcomingByName();
  if (!tournament) throw new Error('No Fighting Game Dojo tournament found (hub and name search both came up empty).');

  const found = normalizeTournamentSlug(tournament.slug);
  const existed = Boolean(findExistingTournament(current, found));
  const result = updateNextEventConfig(current, tournament);
  const when = new Date(tournament.startAt * 1000).toISOString();

  if (!result.changed) {
    await report(`Latest event \`${found}\` (${when}) is already in tournament_slugs.json. Nothing to do.`);
    return;
  }

  await fs.writeFile(configFile, `${JSON.stringify(result.config, null, 2)}\n`);
  await report(existed
    ? `Latest event \`${found}\` was already listed; updated nextEventUrl.`
    : `New event \`${found}\` (${when}) was NOT in tournament_slugs.json: added it to Season ${seasonIdForTimestamp(tournament.startAt)} and set nextEventUrl.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`Next-event discovery failed: ${error.message}`);
    process.exitCode = 1;
  });
}
