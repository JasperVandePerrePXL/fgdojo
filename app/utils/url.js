// Query-string helpers for shareable links (selected season/game, player pages).
// Pure functions: the caller passes `location.search` and applies the result with history.replaceState.

/** Query parameters as a plain object, e.g. `?season=1&game=43868` -> `{ season: '1', game: '43868' }`. */
export function readQuery(search) {
  return Object.fromEntries(new URLSearchParams(search));
}

/**
 * The query string with `updates` applied; a null/undefined/'' value removes that parameter.
 * @returns {string} `?a=1&b=2`, or '' when no parameters are left.
 */
export function updateQuery(search, updates) {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === '') params.delete(key);
    else params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Link to a player page, opened on the given game when known. */
export function playerUrl(playerId, gameId) {
  return `/player.html${updateQuery('', { id: playerId, game: gameId })}`;
}

/** `1` -> `1st`, `2` -> `2nd`, `13` -> `13th`, `22` -> `22nd`. */
export function ordinal(n) {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
  return `${n}${suffix}`;
}
