// start.gg accounts that belong to the same player (data/player_aliases.json). getPlayerId in src/stats/names.js
// maps every extra account to the main one, so rankings, Elo, stats and player pages treat them as one player.
import { readJsonSync } from '../lib/json.js';
import { PLAYER_ALIASES_FILE } from '../lib/paths.js';

/**
 * Map of extra account ID -> main account ID.
 * @param {{ players?: { playerId: string|number, otherIds?: (string|number)[] }[] }} config
 * @returns {Map<string, string>}
 * @throws When an ID is listed twice, so a typo cannot silently merge the wrong players.
 */
export function buildAliasMap(config) {
  const aliases = new Map();
  const seen = new Set();
  for (const { playerId, otherIds = [] } of config.players ?? []) {
    for (const id of [playerId, ...otherIds].map(String)) {
      if (seen.has(id)) throw new Error(`player_aliases.json: player ID ${id} is listed more than once`);
      seen.add(id);
    }
    for (const other of otherIds) aliases.set(String(other), String(playerId));
  }
  return aliases;
}

const ALIASES = buildAliasMap(readJsonSync(PLAYER_ALIASES_FILE));

/**
 * The main account ID for an ID listed in `otherIds`; any other ID is returned unchanged.
 * Keeps the input type (start.gg IDs are numbers), so maps keyed by player ID see one key per player.
 */
export function canonicalPlayerId(id) {
  if (id == null) return id;
  const main = ALIASES.get(String(id));
  if (main == null) return id;
  return typeof id === 'number' ? Number(main) : main;
}
