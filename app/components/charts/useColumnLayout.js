// Shared geometry of the column charts (line and stacked bars): one band per column, a y scale
// from 0 to a nice maximum, and the hovered column for the tooltip.
import { computed, ref } from 'vue';
import { niceScale } from '../../utils/chart.js';

export const WIDTH = 800;
export const HEIGHT = 260;
export const MARGIN = { top: 12, right: 8, bottom: 28, left: 36 };
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

/**
 * @param {import('vue').Ref<object[]>} columns
 * @param {import('vue').Ref<number>} maxValue Highest value to fit (e.g. the tallest stack).
 */
export function useColumnLayout(columns, maxValue) {
  const hovered = ref(null);
  const band = computed(() => (WIDTH - MARGIN.left - MARGIN.right) / Math.max(1, columns.value.length));
  const scale = computed(() => niceScale(maxValue.value));
  const yMax = computed(() => scale.value.max);
  const ticks = computed(() => scale.value.ticks);
  /** Show every label when they fit, else every other one. */
  const labelEvery = computed(() => (band.value >= 44 ? 1 : 2));

  const bandX = (index) => MARGIN.left + index * band.value;
  const centerX = (index) => bandX(index) + band.value / 2;
  const y = (value) => MARGIN.top + PLOT_HEIGHT - (value / yMax.value) * PLOT_HEIGHT;
  /** Tooltip position as a percentage of the chart width, kept inside the card. */
  const tooltipLeft = (index) => `${Math.min(80, Math.max(2, (centerX(index) / WIDTH) * 100 - 10))}%`;

  return { hovered, band, ticks, labelEvery, bandX, centerX, y, tooltipLeft };
}
