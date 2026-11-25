<script setup>
// One row of buttons that picks the date range of the whole stats page.
defineProps({
  /** `{ id, label }[]` from utils/ranges.js. */
  ranges: { type: Array, required: true },
  selected: { type: String, required: true },
});
const emit = defineEmits(['select']);
</script>

<template>
  <div class="range-filter" role="group" aria-label="Period">
    <span class="range-label">Period</span>
    <button
      v-for="range in ranges"
      :key="range.id"
      type="button"
      class="tab"
      :class="{ year: /^\d{4}$/.test(range.id) }"
      :aria-pressed="range.id === selected"
      @click="emit('select', range.id)"
    >
      {{ range.label }}
    </button>
  </div>
</template>
