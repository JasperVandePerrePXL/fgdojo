// Storage for the raw start.gg events: one file, `data/events.json`, grouped by season ID.
//   { "0": [event, ...], "1": [event, ...] }
// All functions take the project root so tests can use a temporary folder.
import fs from 'node:fs/promises';
import path from 'node:path';
import { readJsonOr } from '../lib/json.js';

const DATA_DIR = 'data';
const EVENTS_FILE = 'events.json';

/** @returns {Promise<Record<string, object[]>>} Raw events per season ID ({} when nothing is stored yet). */
export async function readRawEvents(rootDir) {
  return readJsonOr(path.join(rootDir, DATA_DIR, EVENTS_FILE), {});
}

/** Replaces `data/events.json` with `seasons` (creating the data folder if needed). */
export async function writeRawEvents(rootDir, seasons) {
  const dir = path.join(rootDir, DATA_DIR);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, EVENTS_FILE), JSON.stringify(seasons, null, 2));
}

const LEGACY_SEASON_FILE = /^output_season_(\d+)\.json$/;
const LEGACY_LEADERBOARD_FILE = /^leaderboard(?:_season_\d+)?\.json$/;

/**
 * One-time migration of the old file layout into `data/events.json`:
 * - `output_season_<n>.json` in the project root become season `<n>`,
 * - a lone `output.json` is kept under the `__combined` key,
 * - old `leaderboard*.json` files in the root are deleted.
 * Existing seasons in `data/events.json` always win. Safe to call on every run.
 */
export async function migrateLegacyData(rootDir) {
  const existing = await readRawEvents(rootDir);
  const migrated = { ...existing };
  const files = await fs.readdir(rootDir);

  for (const file of files.filter((name) => LEGACY_SEASON_FILE.test(name))) {
    const seasonId = file.match(LEGACY_SEASON_FILE)[1];
    const source = path.join(rootDir, file);
    if (!(seasonId in migrated)) {
      migrated[seasonId] = await readJsonOr(source, []);
    }
    await fs.rm(source, { force: true });
  }

  if (!Object.keys(migrated).length) {
    const combined = await readJsonOr(path.join(rootDir, 'output.json'), []);
    if (combined.length) migrated.__combined = combined;
  }

  await writeRawEvents(rootDir, migrated);

  await fs.rm(path.join(rootDir, 'output.json'), { force: true });
  for (const file of files.filter((name) => LEGACY_LEADERBOARD_FILE.test(name))) {
    await fs.rm(path.join(rootDir, file), { force: true });
  }
}
