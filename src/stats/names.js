// Player identity helpers for the raw start.gg participant objects.

/** The stable player ID: start.gg's `player.id`, falling back to the participant ID. */
export const getPlayerId = (participant) => participant?.player?.id ?? participant?.id;

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
