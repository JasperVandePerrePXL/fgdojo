// Small start.gg GraphQL client with retry/backoff and request throttling.
import { GraphQLClient } from 'graphql-request';

const ENDPOINT = 'https://api.start.gg/gql/alpha';
/** Pause after every successful request: start.gg allows ~80 requests per 60 seconds. */
const THROTTLE_MS = 900;
const MAX_BACKOFF_MS = 30_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The API key from the environment. `STARTGG_KEY` is the main name (and the GitHub secret);
 * `STARTGG_API_KEY` is accepted as an alternative. Never hardcode a key.
 * @returns {string} The key, or an empty string when none is set.
 */
export const getKey = () => process.env.STARTGG_KEY || process.env.STARTGG_API_KEY || '';

/**
 * Runs a GraphQL query against start.gg.
 * Retries network errors, HTTP 429 and 5xx with exponential backoff; other errors are thrown immediately.
 * @param {string} query GraphQL document.
 * @param {object} variables Query variables.
 * @param {{ retries?: number }} [options] Number of retries after the first attempt.
 * @returns {Promise<object>} The `data` part of the response.
 */
export async function gql(query, variables, { retries = 4 } = {}) {
  const client = new GraphQLClient(ENDPOINT, { headers: { Authorization: `Bearer ${getKey()}` } });

  for (let attempt = 0; ; attempt++) {
    try {
      const data = await client.request(query, variables);
      await sleep(THROTTLE_MS);
      return data;
    } catch (err) {
      const status = err.response?.status;
      const retryable = !status || status === 429 || status >= 500;
      if (!retryable || attempt >= retries) throw err;

      const wait = Math.min(MAX_BACKOFF_MS, 2000 * 2 ** attempt) + Math.random() * 500;
      console.warn(
        `  ↻ retry ${attempt + 1}/${retries} in ${Math.round(wait / 1000)}s (${status ?? err.code ?? 'network'})`,
      );
      await sleep(wait);
    }
  }
}
