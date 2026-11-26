<script setup>
// Previous/next buttons with "1–10 of 27", shared by every paged list and table. Hidden with one page.
defineProps({
  /** Result of paginate() (app/utils/pagination.js). */
  view: { type: Object, required: true },
  /** Accessible name, e.g. "Player rankings pages". */
  label: { type: String, required: true },
});
const emit = defineEmits(['page']);
</script>

<template>
  <nav v-if="view.pageCount > 1" class="pager" :aria-label="label">
    <button type="button" :disabled="view.page === 1" @click="emit('page', view.page - 1)">‹ Previous</button>
    <span aria-live="polite">{{ view.first }}–{{ view.last }} of {{ view.total }}</span>
    <button type="button" :disabled="view.page === view.pageCount" @click="emit('page', view.page + 1)">
      Next ›
    </button>
  </nav>
</template>
