// Players excluded from every ranking, winner display and statistic (data/hidden_players.json).
import { readJsonSync } from '../lib/json.js';
import { HIDDEN_PLAYERS_FILE } from '../lib/paths.js';

const HIDDEN_PLAYER_CONFIG = readJsonSync(HIDDEN_PLAYERS_FILE);

const normalize = (name) => String(name).trim().toLowerCase();

const hiddenNames = new Set((HIDDEN_PLAYER_CONFIG.displayNames ?? []).map(normalize));
const hiddenIds = new Set((HIDDEN_PLAYER_CONFIG.playerIds ?? []).map(String));

/**
 * @param {{ playerId?: string|number, displayName?: string }} [player]
 * @returns {boolean} True when the player ID or (case-insensitive) display name is on the hidden list.
 */
export function isHiddenPlayer({ playerId, displayName } = {}) {
  if (playerId != null && hiddenIds.has(String(playerId))) return true;
  if (typeof displayName !== 'string') return false;
  return hiddenNames.has(normalize(displayName));
}
