// A "dojo" is one tournament day. A dojo with several game events counts once.

/**
 * Stable identifier of a dojo: the tournament slug, or date + name when there is no slug.
 * @param {{ dojoId?: string|null, date?: string|null, name?: string }} tournament A TournamentInfo.
 */
export const dojoKeyOf = (tournament) => tournament.dojoId || `${tournament.date}|${tournament.name}`;
