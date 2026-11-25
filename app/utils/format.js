// Small pure display helpers used by the interface components.

/**
 * CSS class for a win rate: `high` (60%+), `medium` (45%+) or `low`.
 * @param {number} rate Win rate in percent.
 */
export function rateClass(rate) {
  return rate >= 60 ? 'high' : rate >= 45 ? 'medium' : 'low';
}
