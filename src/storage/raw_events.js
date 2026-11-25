// Storage for the raw start.gg events: one file, `data/events.json`, grouped by season ID.
//   { "0": [event, ...], "1": [event, ...] }
// The file path is a parameter so tests can use a temporary file.
import fs from 'node:fs/promises';
import path from 'node:path';
import { readJsonOr } from '../lib/json.js';
import { EVENTS_FILE } from '../lib/paths.js';

/** @returns {Promise<Record<string, object[]>>} Raw events per season ID ({} when nothing is stored yet). */
export async function readRawEvents(file = EVENTS_FILE) {
  return readJsonOr(file, {});
}

/** Replaces the raw events file with `seasons` (creating its folder if needed). */
export async function writeRawEvents(seasons, file = EVENTS_FILE) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(seasons, null, 2));
}
