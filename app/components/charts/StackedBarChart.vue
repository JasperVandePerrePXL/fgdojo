<script setup>
// Stacked column chart: one column per x value, one segment per series, 2px gaps between segments.
import { computed, toRef } from 'vue';
import ColumnAxes from './ColumnAxes.vue';
import HoverBands from './HoverBands.vue';
import { HEIGHT, WIDTH, useColumnLayout } from './useColumnLayout.js';
import { roundedTopBar } from '../../utils/chart.js';

const GAP = 2;

const props = defineProps({
  /** `{ label, title, values: number[] }[]`; `values` follow the order of `series`. */
  columns: { type: Array, required: true },
  /** `{ name, color }[]`. */
  series: { type: Array, required: true },
});

const columns = toRef(props, 'columns');
const totals = computed(() => columns.value.map((column) => column.values.reduce((sum, v) => sum + v, 0)));
const layout = useColumnLayout(
  columns,
  computed(() => Math.max(0, ...totals.value)),
);

/** Segments of every column, bottom to top; only the top segment gets rounded corners. */
const bars = computed(() => {
  const width = Math.min(48, Math.max(4, layout.band.value * 0.62)); // thin bars, also with few columns
  return columns.value.flatMap((column, index) => {
    const x = layout.centerX(index) - width / 2;
    const visible = column.values.map((value, s) => ({ value, s })).filter(({ value }) => value > 0);
    let base = 0;
    return visible.map(({ value, s }, n) => {
      const top = layout.y(base + value);
      const bottom = layout.y(base);
      base += value;
      const height = Math.max(0, bottom - top - (n > 0 ? GAP : 0));
      const isTop = n === visible.length - 1;
      return {
        key: `${index}-${s}`,
        color: props.series[s].color,
        d: isTop ? roundedTopBar(x, top, width, height) : `M${x},${top}h${width}v${height}h${-width}Z`,
      };
    });
  });
});

const active = computed(() => {
  const index = layout.hovered.value;
  if (index == null) return null;
  return { column: columns.value[index], total: totals.value[index] };
});
</script>

<template>
  <div class="chart">
    <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" role="img" aria-label="Stacked bar chart">
      <ColumnAxes :layout="layout" :columns="columns" />
      <path v-for="bar in bars" :key="bar.key" :d="bar.d" :fill="bar.color" />
      <HoverBands :layout="layout" :columns="columns" @hover="layout.hovered.value = $event" />
    </svg>
    <div v-if="active" class="tooltip" :style="{ left: layout.tooltipLeft(layout.hovered.value) }">
      <strong>{{ active.column.title }}</strong>
      <span v-for="(item, s) in series" :key="item.name">
        <i :style="{ background: item.color }"></i>{{ item.name }}: {{ active.column.values[s] }}
      </span>
      <span class="total">Total: {{ active.total }}</span>
    </div>
  </div>
</template>
