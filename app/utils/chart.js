// Pure helpers for the hand-made SVG charts on the stats page.

/** Number of categorical series colors defined in styles.css (`--series-1` ... `--series-5`). */
export const SERIES_COLOR_COUNT = 5;

/**
 * Color of the n-th series (0-based), in fixed order. Series past the palette share a neutral color;
 * never generate extra hues.
 */
export function seriesColor(index) {
  return index < SERIES_COLOR_COUNT ? `var(--series-${index + 1})` : 'var(--muted)';
}

/**
 * Y scale from 0 that fits `value` with at most `count + 1` steps of a "nice" size (1, 2 or 5 times a power of ten).
 * @returns {{ max: number, ticks: number[] }}
 */
export function niceScale(value, count = 4) {
  if (!(value > 0)) return { max: 1, ticks: [0, 1] };
  const power = 10 ** Math.floor(Math.log10(value / (count + 1)));
  const step = [1, 2, 5, 10, 20]
    .map((factor) => factor * power)
    .find((candidate) => Math.ceil(value / candidate) <= count + 1);
  const steps = Math.ceil(value / step);
  return { max: steps * step, ticks: Array.from({ length: steps + 1 }, (_, i) => i * step) };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2025-03-09` -> `Mar '25`; '' when there is no date. */
export function shortDate(date) {
  if (!date) return '';
  const [year, month] = date.split('-');
  return `${MONTHS[Number(month) - 1]} '${year.slice(-2)}`;
}

/**
 * SVG path of a bar with rounded top corners (data end) and a square base.
 * @param {number} x @param {number} y Top-left corner. @param {number} w @param {number} h
 * @param {number} [r] Corner radius, clamped to the bar size.
 */
export function roundedTopBar(x, y, w, h, r = 4) {
  const radius = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + radius}Q${x},${y} ${x + radius},${y}H${x + w - radius}Q${x + w},${y} ${x + w},${y + radius}V${y + h}Z`;
}
