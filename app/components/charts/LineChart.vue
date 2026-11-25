<script setup>
// Single-series line chart with markers, a crosshair and a tooltip per column.
import { computed, toRef } from 'vue';
import ColumnAxes from './ColumnAxes.vue';
import HoverBands from './HoverBands.vue';
import { HEIGHT, MARGIN, WIDTH, useColumnLayout } from './useColumnLayout.js';

const props = defineProps({
  /** `{ label, title, value }[]` in x order. */
  points: { type: Array, required: true },
  /** Name of the value in the tooltip, e.g. "players". */
  unit: { type: String, required: true },
  color: { type: String, default: 'var(--series-1)' },
});

const points = toRef(props, 'points');
const layout = useColumnLayout(
  points,
  computed(() => Math.max(0, ...points.value.map((point) => point.value))),
);
const path = computed(() =>
  points.value.map((point, i) => `${i ? 'L' : 'M'}${layout.centerX(i)},${layout.y(point.value)}`).join(''),
);
const active = computed(() => points.value[layout.hovered.value] ?? null);
</script>

<template>
  <div class="chart">
    <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" role="img" :aria-label="`Line chart of ${unit}`">
      <ColumnAxes :layout="layout" :columns="points" />
      <line
        v-if="active"
        class="crosshair"
        :x1="layout.centerX(layout.hovered.value)"
        :x2="layout.centerX(layout.hovered.value)"
        :y1="MARGIN.top"
        :y2="HEIGHT - MARGIN.bottom"
      />
      <path :d="path" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" />
      <circle
        v-for="(point, i) in points"
        :key="i"
        class="marker"
        :cx="layout.centerX(i)"
        :cy="layout.y(point.value)"
        :r="layout.hovered.value === i ? 6 : 4"
        :fill="color"
      />
      <HoverBands :layout="layout" :columns="points" @hover="layout.hovered.value = $event" />
    </svg>
    <div v-if="active" class="tooltip" :style="{ left: layout.tooltipLeft(layout.hovered.value) }">
      <strong>{{ active.title }}</strong>
      <span>{{ active.value }} {{ unit }}</span>
    </div>
  </div>
</template>
