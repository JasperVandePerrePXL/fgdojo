import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINAL_AFTER_MS,
  MAX_CONSECUTIVE_FAILURES,
  createEventFetcher,
  mergeSeasonEvents,
} from '../src/pipeline/event_fetcher.js';

const NOW = Date.UTC(2026, 10, 25);

/** In-memory stand-in for the file cache. */
function memoryCache(entries = {}) {
  const store = new Map(Object.entries(entries));
  return {
    store,
    read: async (key) => store.get(key) ?? null,
    write: async (key, data) => void store.set(key, { savedAt: NOW, data }),
  };
}

const startAtDaysAgo = (days) => Math.floor((NOW - days * 86_400_000) / 1000);
const silent = () => {};

test('finished events come from the cache without calling the API', async () => {
  const old = { name: 'old', startAt: startAtDaysAgo(FINAL_AFTER_MS / 86_400_000 + 1) };
  let calls = 0;
  const fetcher = createEventFetcher({
    requestEvent: async () => {
      calls++;
      return null;
    },
    cache: memoryCache({ a: { savedAt: 0, data: old } }),
    now: () => NOW,
  });

  assert.equal(await fetcher.fetchEvent('a'), old);
  assert.equal(calls, 0);
});

test('recent events are re-downloaded and cached', async () => {
  const fresh = { name: 'fresh', startAt: startAtDaysAgo(1) };
  const cache = memoryCache();
  const fetcher = createEventFetcher({ requestEvent: async () => fresh, cache, now: () => NOW });

  assert.equal(await fetcher.fetchEvent('a'), fresh);
  assert.equal(cache.store.get('a').data, fresh);
});

test('a failed request falls back to the cached copy', async () => {
  const cachedCopy = { name: 'cached', startAt: startAtDaysAgo(1) };
  const fetcher = createEventFetcher({
    requestEvent: async () => {
      throw new Error('boom');
    },
    cache: memoryCache({ a: { savedAt: 0, data: cachedCopy } }),
    now: () => NOW,
    logError: silent,
  });

  assert.equal(await fetcher.fetchEvent('a'), cachedCopy);
});

test('the API is treated as down after repeated failures', async () => {
  let calls = 0;
  const fetcher = createEventFetcher({
    requestEvent: async () => {
      calls++;
      throw new Error('down');
    },
    cache: memoryCache(),
    now: () => NOW,
    logError: silent,
  });

  for (let i = 0; i < MAX_CONSECUTIVE_FAILURES + 2; i++) await fetcher.fetchEvent(`slug-${i}`);
  assert.equal(calls, MAX_CONSECUTIVE_FAILURES);
});

test('event slug variants are tried in order until one exists', async () => {
  const tried = [];
  const fetcher = createEventFetcher({
    requestEvent: async (slug) => {
      tried.push(slug);
      return slug === 'b' ? { name: 'b' } : null;
    },
    cache: memoryCache(),
    now: () => NOW,
  });

  assert.deepEqual(await fetcher.fetchFirstExistingEvent(['a', 'b', 'c']), { name: 'b' });
  assert.deepEqual(tried, ['a', 'b']);
});

test('a season with fewer events than before keeps its previous data', () => {
  const previous = [{ id: 1 }, { id: 2 }];
  assert.deepEqual(mergeSeasonEvents(previous, [{ id: 1 }]), { events: previous, keptPrevious: true });
  assert.deepEqual(mergeSeasonEvents(previous, [{ id: 1 }, { id: 2 }, { id: 3 }]).keptPrevious, false);
  assert.deepEqual(mergeSeasonEvents(undefined, []).events, []);
});
