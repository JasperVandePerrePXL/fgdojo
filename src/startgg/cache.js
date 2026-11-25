// On-disk cache for start.gg responses (`.cache/startgg/`, never committed).
// GitHub Actions restores this folder between runs so finished tournaments are not downloaded again.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'startgg');

const cacheFile = (key) => path.join(CACHE_DIR, `${crypto.createHash('sha1').update(key).digest('hex')}.json`);

/**
 * @param {string} key Any string, e.g. an event slug.
 * @param {number} [maxAgeMs] When given, `fresh` tells whether the entry is younger than this.
 * @returns {Promise<{ data: any, fresh: boolean } | null>} null when nothing is cached.
 */
export async function readCache(key, maxAgeMs) {
  try {
    const { savedAt, data } = JSON.parse(await fs.readFile(cacheFile(key), 'utf8'));
    return { data, fresh: maxAgeMs == null || Date.now() - savedAt < maxAgeMs };
  } catch {
    return null;
  }
}

/** Stores `data` under `key`, stamped with the current time. */
export async function writeCache(key, data) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cacheFile(key), JSON.stringify({ savedAt: Date.now(), data }));
}
