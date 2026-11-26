// When the next dojo is "upcoming", "live" or "over", in Brussels time, for the Next dojo card.
// Uses only standard JavaScript (Intl), no Node.js or browser APIs.

/** Sign-ups on start.gg close at this time on the dojo day; the card then switches to "Live now". */
export const SIGNUPS_CLOSE = '13:58';

const brussels = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Brussels',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * @param {Date} now
 * @returns {{ date: string, time: string }} `YYYY-MM-DD` and `HH:MM` in Brussels time.
 */
export function brusselsNow(now) {
  const parts = Object.fromEntries(brussels.formatToParts(now).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/**
 * @param {{ date: string|null }|null} dojo The next dojo (see NextDojo in src/stats/types.js).
 * @param {Date} now
 * @returns {'upcoming'|'live'|'over'|null} `upcoming` before the day and on the day until SIGNUPS_CLOSE,
 *   `live` for the rest of the dojo day, `over` afterwards; null without a dojo or date.
 */
export function dojoPhase(dojo, now) {
  if (!dojo?.date) return null;
  const { date, time } = brusselsNow(now);
  if (dojo.date > date) return 'upcoming';
  if (dojo.date < date) return 'over';
  return time < SIGNUPS_CLOSE ? 'upcoming' : 'live';
}
