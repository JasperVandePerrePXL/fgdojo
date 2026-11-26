// Player identity helpers for the raw start.gg participant objects.
import { canonicalPlayerId } from '../config/player_aliases.js';

/**
 * The stable player ID: start.gg's `player.id`, falling back to the participant ID. A second account of the same
 * player (data/player_aliases.json) is replaced by the main account's ID, so every statistic merges them.
 */
export const getPlayerId = (participant) => canonicalPlayerId(participant?.player?.id ?? participant?.id);

/**
 * Builds the name shown on the site.
 * - With a prefix: "prefix | gamerTag".
 * - Otherwise the entrant name when it already has the "prefix | tag" form, else the gamerTag.
 * @param {{ prefix?: string, gamerTag: string, entrantName?: string }} parts
 */
export function formatDisplayName({ prefix, gamerTag, entrantName }) {
  if (prefix) return `${prefix} | ${gamerTag}`;
  return entrantName && entrantName.includes(' | ') ? entrantName : gamerTag;
}
