// Whether the next dojo card should still be shown. The data is built a few times a week, so the page
// checks the date itself and hides a dojo whose day has passed.

const brusselsDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Brussels',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * @param {string|null} date `YYYY-MM-DD` (Brussels time) of the dojo.
 * @param {Date} now
 * @returns {boolean} True on the dojo day itself and before it.
 */
export function isUpcoming(date, now) {
  if (!date) return false;
  return date >= brusselsDate.format(now);
}
