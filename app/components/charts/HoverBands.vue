<script setup>
// Full-height transparent targets, one per column, so hovering anywhere in a column shows its tooltip.
// Emits `hover` with the column index, or null when the pointer leaves.
import { HEIGHT, MARGIN } from './useColumnLayout.js';

defineProps({
  layout: { type: Object, required: true },
  columns: { type: Array, required: true },
});
defineEmits(['hover']);
</script>

<template>
  <rect
    v-for="(column, index) in columns"
    :key="index"
    class="hover-band"
    :class="{ active: layout.hovered.value === index }"
    :x="layout.bandX(index)"
    :y="MARGIN.top"
    :width="layout.band.value"
    :height="HEIGHT - MARGIN.top - MARGIN.bottom"
    @mouseenter="$emit('hover', index)"
    @mouseleave="$emit('hover', null)"
  />
</template>
