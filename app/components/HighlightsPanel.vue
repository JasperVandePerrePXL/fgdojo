<script setup>
// Side panel with the all-time top lists. Which lists exist is defined once in shared/highlights.js;
// the lists themselves are calculated by the data pipeline (`funStats` in leaderboards.json).
import HighlightList from './HighlightList.vue';
import { HIGHLIGHTS } from '../../shared/highlights.js';

/** Number of players shown per list (the data holds a few more). */
const VISIBLE_COUNT = 3;

defineProps({
  /** `funStats` of the selected game across all seasons. */
  funStats: { type: Object, default: () => ({}) },
});
</script>

<template>
  <aside class="card side">
    <h3>All-time highlights</h3>
    <div v-for="highlight in HIGHLIGHTS" :key="highlight.id" class="side-section">
      <small class="eyebrow">{{ highlight.label }}</small>
      <HighlightList
        :items="(funStats[highlight.id] ?? []).slice(0, VISIBLE_COUNT)"
        :value-key="highlight.valueKey"
        :suffix="highlight.suffix"
      />
    </div>
  </aside>
</template>
