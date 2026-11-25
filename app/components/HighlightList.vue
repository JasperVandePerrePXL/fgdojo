<script setup>
// A short numbered list of players with one value each (used by HighlightsPanel).
defineProps({
  /** Players to show, best first. */
  items: { type: Array, default: () => [] },
  /** Which property of each player to display as the value. */
  valueKey: { type: String, required: true },
  /** Text appended to the value, e.g. "%". */
  suffix: { type: String, default: '' },
});
</script>

<template>
  <ol v-if="items.length">
    <li v-for="item in items" :key="item.displayName">
      <span>{{ item.displayName }}</span>
      <b>{{ item[valueKey] }}{{ suffix }}</b>
    </li>
  </ol>
  <p v-else class="empty compact">Not enough data yet.</p>
</template>
