<script setup>
// Donut of parts of a whole, with a legend that names every part with its value and share.
import { computed, ref } from 'vue';

const SIZE = 200;
const RADIUS = 80;
const THICKNESS = 28;
/** Surface-colored gap between neighbouring arcs, in px along the circle. */
const GAP = 2;

const props = defineProps({
  /** `{ name, value, color }[]`. */
  parts: { type: Array, required: true },
  /** Word under the total in the middle, e.g. "entrants". */
  unit: { type: String, required: true },
});

const hovered = ref(null);
const total = computed(() => props.parts.reduce((sum, part) => sum + part.value, 0));
const share = (value) => (total.value ? Math.round((value / total.value) * 1000) / 10 : 0);

/** One dashed circle per part, offset so the parts follow each other around the ring. */
const arcs = computed(() => {
  const circumference = 2 * Math.PI * RADIUS;
  let offset = 0;
  return props.parts.map((part) => {
    const length = total.value ? (part.value / total.value) * circumference : 0;
    const drawn = Math.max(0, length - GAP);
    const arc = { ...part, dasharray: `${drawn} ${circumference - drawn}`, dashoffset: -offset };
    offset += length;
    return arc;
  });
});
</script>

<template>
  <div class="donut">
    <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" role="img" :aria-label="`Share of ${unit} per game`">
      <g :transform="`rotate(-90 ${SIZE / 2} ${SIZE / 2})`">
        <circle
          v-for="(arc, i) in arcs"
          :key="arc.name"
          class="donut-arc"
          :cx="SIZE / 2"
          :cy="SIZE / 2"
          :r="RADIUS"
          fill="none"
          :stroke="arc.color"
          :stroke-width="hovered === i ? THICKNESS + 6 : THICKNESS"
          :stroke-dasharray="arc.dasharray"
          :stroke-dashoffset="arc.dashoffset"
          @mouseenter="hovered = i"
          @mouseleave="hovered = null"
        />
      </g>
      <text :x="SIZE / 2" :y="SIZE / 2 - 4" text-anchor="middle" class="donut-total">
        {{ hovered == null ? total : parts[hovered].value }}
      </text>
      <text :x="SIZE / 2" :y="SIZE / 2 + 16" text-anchor="middle" class="donut-unit">
        {{ hovered == null ? unit : `${share(parts[hovered].value)}%` }}
      </text>
    </svg>
    <ul class="legend vertical">
      <li
        v-for="(part, i) in parts"
        :key="part.name"
        :class="{ active: hovered === i }"
        @mouseenter="hovered = i"
        @mouseleave="hovered = null"
      >
        <i :style="{ background: part.color }"></i>
        <span>{{ part.name }}</span>
        <b>{{ part.value }} · {{ share(part.value) }}%</b>
      </li>
    </ul>
  </div>
</template>
