// Small start.gg client: retry/backoff on 429/5xx, on-disk cache, tournament discovery.
import { GraphQLClient } from 'graphql-request';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ENDPOINT = 'https://api.start.gg/gql/alpha';
const CACHE_DIR = path.join(process.cwd(), '.cache', 'startgg');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// STARTGG_KEY is the existing secret name; STARTGG_API_KEY is accepted too. Never hardcode a key.
export const getKey = () => process.env.STARTGG_KEY || process.env.STARTGG_API_KEY || '';

export async function gql(query, variables, { retries = 4 } = {}) {
  const client = new GraphQLClient(ENDPOINT, { headers: { Authorization: `Bearer ${getKey()}` } });
  for (let attempt = 0; ; attempt++) {
    try {
      const data = await client.request(query, variables);
      await sleep(900); // stay well under start.gg's ~80 requests / 60s limit
      return data;
    } catch (err) {
      const status = err.response?.status;
      const retryable = !status || status === 429 || status >= 500;
      if (!retryable || attempt >= retries) throw err;
      const wait = Math.min(30000, 2000 * 2 ** attempt) + Math.random() * 500;
      console.warn(`  ↻ retry ${attempt + 1}/${retries} in ${Math.round(wait / 1000)}s (${status ?? err.code ?? 'network'})`);
      await sleep(wait);
    }
  }
}

const cacheFile = (key) => path.join(CACHE_DIR, crypto.createHash('sha1').update(key).digest('hex') + '.json');

export async function readCache(key, maxAgeMs) {
  try {
    const { savedAt, data } = JSON.parse(await fs.readFile(cacheFile(key), 'utf8'));
    return { data, fresh: maxAgeMs == null || Date.now() - savedAt < maxAgeMs };
  } catch { return null; }
}

export async function writeCache(key, data) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cacheFile(key), JSON.stringify({ savedAt: Date.now(), data }));
}

// Finds Fighting Game Dojo tournaments so new editions need no manual slug entry.
// NOTE: the name filter is an assumption about the hub's naming; verify on first run.
const discoverQuery = `query($page: Int!) {
  tournaments(query: { perPage: 50, page: $page, sortBy: "startAt desc", filter: { name: "Fighting Game Dojo" } }) {
    pageInfo { totalPages }
    nodes { slug startAt events { slug } }
  }
}`;

export async function discoverEventSlugs() {
  const out = [];
  for (let page = 1; page <= 3; page++) {
    const { tournaments } = await gql(discoverQuery, { page });
    for (const t of tournaments?.nodes ?? []) {
      for (const e of t.events ?? []) {
        if (/1v1/.test(e.slug)) out.push({ slug: e.slug, startAt: t.startAt });
      }
    }
    if (page >= (tournaments?.pageInfo?.totalPages ?? 1)) break;
  }
  return out;
}
