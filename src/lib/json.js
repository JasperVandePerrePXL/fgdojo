// Tiny JSON file helpers shared by the configuration and storage modules.
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';

/** Reads and parses a JSON file synchronously. Throws if the file is missing or invalid. */
export function readJsonSync(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Reads and parses a JSON file, returning `fallback` when it is missing or invalid. */
export async function readJsonOr(file, fallback) {
  try {
    return JSON.parse(await fsPromises.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}
