// The safety rules of the data fetch, separated from the network and the disk so they can be tested.
// The start.gg request function and the cache are passed in (dependency injection).
//
//  - finished events (older than FINAL_AFTER_MS) are served from the cache and never re-downloaded;
//  - after MAX_CONSECUTIVE_FAILURES failures in a row the API is considered down and cached data is used;
//  - a season that came back with fewer events than before keeps its previous data (`mergeSeasonEvents`).

const DAY_MS = 86_400_000;
/** Results older than this never change, so the cached copy is used without asking the API. */
export const FINAL_AFTER_MS = 14 * DAY_MS;
/** Stop calling the API after this many consecutive failures. */
export const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * @param {object} deps
 * @param {(slug: string, options: { retries: number }) => Promise<object|null>} deps.requestEvent
 *   Downloads one event by full slug; resolves to null when start.gg has no such event.
 * @param {import('../startgg/cache.js').ResponseCache} deps.cache
 * @param {() => number} [deps.now] Current time in ms (injectable for tests).
 * @param {(message: string) => void} [deps.logError]
 */
export function createEventFetcher({ requestEvent, cache, now = Date.now, logError = console.error }) {
  let consecutiveFailures = 0;

  /**
   * Fetches one event by its full slug (`tournament/<t>/event/<e>`).
   * @returns {Promise<object|null>} The event, the last cached copy when the API fails, or null.
   */
  async function fetchEvent(slug) {
    const cached = await cache.read(slug);
    const ageMs = cached?.data?.startAt ? now() - cached.data.startAt * 1000 : 0;
    if (cached && ageMs > FINAL_AFTER_MS) return cached.data;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return cached?.data ?? null;

    try {
      const event = await requestEvent(slug, { retries: consecutiveFailures ? 1 : 3 });
      if (event) {
        consecutiveFailures = 0;
        await cache.write(slug, event);
        return event;
      }
    } catch (err) {
      consecutiveFailures++;
      logError(`  ✗ ${slug}: ${err.response?.errors?.[0]?.message ?? err.message}`);
    }
    return cached?.data ?? null; // graceful fallback to the last known good copy
  }

  /** Tries the known event slug variants of one game in order and returns the first that exists. */
  async function fetchFirstExistingEvent(candidateSlugs) {
    for (const slug of candidateSlugs) {
      const event = await fetchEvent(slug);
      if (event) return event;
    }
    return null;
  }

  return { fetchEvent, fetchFirstExistingEvent };
}

/**
 * Never replaces good data with a worse (partial or empty) result.
 * @param {object[]} previous Events stored before this run.
 * @param {object[]} fetched Events downloaded in this run.
 * @returns {{ events: object[], keptPrevious: boolean }}
 */
export function mergeSeasonEvents(previous = [], fetched = []) {
  return fetched.length < previous.length
    ? { events: previous, keptPrevious: true }
    : { events: fetched, keptPrevious: false };
}
