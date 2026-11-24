import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = 'data';
const EVENTS_FILE = 'events.json';

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}

export async function readRawEvents(rootDir) {
  return readJson(path.join(rootDir, DATA_DIR, EVENTS_FILE), {});
}

export async function writeRawEvents(rootDir, seasons) {
  const dir = path.join(rootDir, DATA_DIR);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, EVENTS_FILE), JSON.stringify(seasons, null, 2));
}

export async function migrateLegacyData(rootDir) {
  const existing = await readRawEvents(rootDir);
  const migrated = { ...existing };
  const files = await fs.readdir(rootDir);

  for (const file of files.filter((name) => /^output_season_(\d+)\.json$/.test(name))) {
    const seasonId = file.match(/^output_season_(\d+)\.json$/)[1];
    const source = path.join(rootDir, file);
    if (!(seasonId in migrated)) {
      migrated[seasonId] = await readJson(source, []);
    }
    await fs.rm(source, { force: true });
  }

  if (!Object.keys(migrated).length) {
    const combined = await readJson(path.join(rootDir, 'output.json'), []);
    if (combined.length) migrated.__combined = combined;
  }

  await writeRawEvents(rootDir, migrated);

  await fs.rm(path.join(rootDir, 'output.json'), { force: true });
  for (const file of files.filter((name) => /^leaderboard(?:_season_\d+)?\.json$/.test(name))) {
    await fs.rm(path.join(rootDir, file), { force: true });
  }
}
