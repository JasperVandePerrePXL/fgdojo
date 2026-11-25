import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readRawEvents, writeRawEvents } from '../src/storage/raw_events.js';

test('raw event data is stored in one JSON file with season groups', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fgdojo-'));
  const file = path.join(root, 'data', 'events.json');
  const seasons = {
    0: [{ name: 'Season 0 event' }],
    1: [{ name: 'Season 1 event' }],
  };

  await writeRawEvents(seasons, file);

  assert.deepEqual(await readRawEvents(file), seasons);
});

test('a missing raw events file reads as no data', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fgdojo-'));
  assert.deepEqual(await readRawEvents(path.join(root, 'missing.json')), {});
});
