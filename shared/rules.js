// Counting rules shared by the data pipeline (src/) and the website (app/).
// Keep this file free of Node.js and browser APIs so both sides can import it.

/** A win-rate highlight needs at least this many games, so one lucky set does not win. */
export const MIN_GAMES_FOR_WIN_RATE = 10;

/**
 * Identifier of a dojo (one tournament day). A dojo with several game events counts once.
 * @param {{ dojoId?: string|null, date?: string|null, name?: string }} tournament A TournamentInfo.
 * @returns {string} The tournament slug, or `date|name` when there is no slug.
 */
export function dojoKeyOf(tournament) {
  return tournament.dojoId || `${tournament.date || ''}|${tournament.name || ''}`;
}
