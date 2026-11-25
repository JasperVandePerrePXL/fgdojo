<script setup>
// Gridlines and axis labels shared by the column charts.
import { HEIGHT, MARGIN, WIDTH } from './useColumnLayout.js';

defineProps({
  layout: { type: Object, required: true },
  columns: { type: Array, required: true },
});
</script>

<template>
  <g class="axes">
    <g v-for="tick in layout.ticks.value" :key="tick">
      <line :x1="MARGIN.left" :x2="WIDTH - MARGIN.right" :y1="layout.y(tick)" :y2="layout.y(tick)" />
      <text :x="MARGIN.left - 6" :y="layout.y(tick)" text-anchor="end" dominant-baseline="middle">
        {{ tick }}
      </text>
    </g>
    <template v-for="(column, index) in columns" :key="index">
      <text
        v-if="index % layout.labelEvery.value === 0"
        :x="layout.centerX(index)"
        :y="HEIGHT - 8"
        text-anchor="middle"
      >
        {{ column.label }}
      </text>
    </template>
  </g>
</template>
