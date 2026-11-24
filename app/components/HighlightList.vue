<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  valueKey: { type: String, required: true },
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
