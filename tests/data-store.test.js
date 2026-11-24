import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { migrateLegacyData, readRawEvents, writeRawEvents } from '../src/data_store.js';

test('raw event data is stored in one JSON file with season groups', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fgdojo-'));
  await writeRawEvents(root, {
    0: [{ name: 'Season 0 event' }],
    1: [{ name: 'Season 1 event' }],
  });

  assert.deepEqual(await readRawEvents(root), {
    0: [{ name: 'Season 0 event' }],
    1: [{ name: 'Season 1 event' }],
  });

  const entries = await fs.readdir(path.join(root, 'data'), { recursive: true });
  assert.ok(entries.includes('events.json'));
  assert.equal(await fs.stat(path.join(root, 'output_season_0.json')).then(() => true).catch(() => false), false);
});

test('legacy root files are migrated once into the data folder', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fgdojo-legacy-'));
  await fs.writeFile(path.join(root, 'output_season_0.json'), JSON.stringify([{ name: 'Legacy 0' }]));
  await fs.writeFile(path.join(root, 'output_season_1.json'), JSON.stringify([{ name: 'Legacy 1' }]));

  await migrateLegacyData(root);

  assert.deepEqual(await readRawEvents(root), {
    0: [{ name: 'Legacy 0' }],
    1: [{ name: 'Legacy 1' }],
  });

  assert.equal(await fs.stat(path.join(root, 'output_season_0.json')).then(() => true).catch(() => false), false);
  assert.equal(await fs.stat(path.join(root, 'output_season_1.json')).then(() => true).catch(() => false), false);
});
