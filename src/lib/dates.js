// Date helpers. Tournaments are held in Belgium, so every date is interpreted in
// the Europe/Brussels time zone regardless of where the code runs (e.g. GitHub Actions in UTC).

const TIME_ZONE = 'Europe/Brussels';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Splits a Unix timestamp into zero-padded Brussels date parts.
 * @param {number} timestamp Unix time in seconds (the unit start.gg uses).
 * @returns {{ year: string, month: string, day: string }}
 */
function getBrusselsDateParts(timestamp) {
  const parts = formatter.formatToParts(new Date(timestamp * 1000));
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/**
 * @param {number|null|undefined} timestamp Unix time in seconds.
 * @returns {string|null} `YYYY-MM-DD` in Brussels time, or null when there is no timestamp.
 */
export function formatBrusselsDate(timestamp) {
  if (!timestamp) return null;
  const { year, month, day } = getBrusselsDateParts(timestamp);
  return `${year}-${month}-${day}`;
}

/**
 * @param {number} timestamp Unix time in seconds.
 * @returns {{ year: number, month: number }} Brussels year and month (1-12).
 */
export function getBrusselsYearMonth(timestamp) {
  const { year, month } = getBrusselsDateParts(timestamp);
  return { year: Number(year), month: Number(month) };
}
