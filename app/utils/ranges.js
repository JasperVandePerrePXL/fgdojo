// Date ranges for the stats page filter: all time, each calendar year and each half year.
// Only periods that contain at least one dojo are offered.

export const ALL_TIME = 'all';

/**
 * @typedef {object} DateRange
 * @property {string} id      `all`, `2025` or `2025-H1`.
 * @property {string} label   Button text, e.g. `H1 2025`.
 * @property {(date: string|null) => boolean} contains  Whether a `YYYY-MM-DD` date falls in the range.
 */

/** Half of the year of a `YYYY-MM-DD` date: 1 (Jan-Jun) or 2 (Jul-Dec). */
const halfOf = (date) => (Number(date.slice(5, 7)) <= 6 ? 1 : 2);

/**
 * @param {(string|null)[]} dates Dojo dates (`YYYY-MM-DD`); missing dates only appear in "All time".
 * @returns {DateRange[]} All time first, then each year followed by its halves, oldest first.
 */
export function buildDateRanges(dates) {
  const ranges = [{ id: ALL_TIME, label: 'All time', contains: () => true }];
  const known = dates.filter(Boolean);
  const years = [...new Set(known.map((date) => date.slice(0, 4)))].sort();

  for (const year of years) {
    ranges.push({ id: year, label: year, contains: (date) => Boolean(date?.startsWith(year)) });
    for (const half of [1, 2]) {
      if (!known.some((date) => date.startsWith(year) && halfOf(date) === half)) continue;
      ranges.push({
        id: `${year}-H${half}`,
        label: `H${half} ${year}`,
        contains: (date) => Boolean(date?.startsWith(year)) && halfOf(date) === half,
      });
    }
  }
  return ranges;
}
