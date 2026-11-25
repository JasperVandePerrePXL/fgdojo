// Small pure display helpers used by the interface components.

/**
 * CSS class for a win rate: `high` (60%+), `medium` (45%+) or `low`.
 * @param {number} rate Win rate in percent.
 */
export function rateClass(rate) {
  return rate >= 60 ? 'high' : rate >= 45 ? 'medium' : 'low';
}

/** Ranking score with one decimal; returns the input unchanged when it is not a number. */
export function formatScore(score) {
  return score?.toFixed ? score.toFixed(1) : score;
}
