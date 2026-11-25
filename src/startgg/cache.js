// On-disk cache for start.gg responses (`.cache/startgg/`, never committed).
// GitHub Actions restores this folder between runs so finished tournaments are not downloaded again.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { STARTGG_CACHE_DIR } from '../lib/paths.js';

/**
 * @typedef {object} ResponseCache
 * @property {(key: string) => Promise<{ savedAt: number, data: any } | null>} read  null when nothing is cached.
 * @property {(key: string, data: any) => Promise<void>} write
 */

/**
 * Creates a cache that stores one JSON file per key in `dir`.
 * @param {string} [dir]
 * @returns {ResponseCache}
 */
export function createFileCache(dir = STARTGG_CACHE_DIR) {
  const fileFor = (key) => path.join(dir, `${crypto.createHash('sha1').update(key).digest('hex')}.json`);

  return {
    async read(key) {
      try {
        const { savedAt, data } = JSON.parse(await fs.readFile(fileFor(key), 'utf8'));
        return { savedAt, data };
      } catch {
        return null;
      }
    },

    async write(key, data) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fileFor(key), JSON.stringify({ savedAt: Date.now(), data }));
    },
  };
}
