import test from 'node:test';
import assert from 'node:assert/strict';
import { getKey } from '../src/startgg/client.js';

test('getKey prefers STARTGG_KEY and accepts STARTGG_API_KEY', () => {
  const originalKey = process.env.STARTGG_KEY;
  const originalApiKey = process.env.STARTGG_API_KEY;

  try {
    delete process.env.STARTGG_KEY;
    process.env.STARTGG_API_KEY = 'api-key';
    assert.equal(getKey(), 'api-key');

    process.env.STARTGG_KEY = 'secret-key';
    assert.equal(getKey(), 'secret-key');
  } finally {
    if (originalKey === undefined) delete process.env.STARTGG_KEY;
    else process.env.STARTGG_KEY = originalKey;

    if (originalApiKey === undefined) delete process.env.STARTGG_API_KEY;
    else process.env.STARTGG_API_KEY = originalApiKey;
  }
});
