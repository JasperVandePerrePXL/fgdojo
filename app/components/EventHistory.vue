<script setup>
// One card per tournament with its date, winner and number of entrants: newest first, HISTORY_PAGE_SIZE per page.
// A new season or game starts at page 1.
import { computed, ref, watch } from 'vue';
import { paginate } from '../utils/pagination.js';
import PagerNav from './PagerNav.vue';

/** Cards per page. */
const HISTORY_PAGE_SIZE = 6;

const props = defineProps({
  /** TournamentInfo[], oldest first (as stored). */
  tournaments: { type: Array, required: true },
});

const newestFirst = computed(() => [...props.tournaments].reverse());
const page = ref(1);
watch(
  () => props.tournaments,
  () => (page.value = 1),
);
const view = computed(() => paginate(newestFirst.value, page.value, HISTORY_PAGE_SIZE));
</script>

<template>
  <h2 class="history-title">Event history</h2>
  <ul class="history">
    <li v-for="tournament in view.rows" :key="`${tournament.dojoId}-${tournament.eventName}`" class="card">
      <time>{{ tournament.date || 'Date TBD' }}</time>
      <strong>{{ tournament.name }}</strong>
      <span>🏆 {{ tournament.winner || 'Results pending' }}</span>
      <br /><small>{{ tournament.entrantCount || 0 }} entrants</small>
    </li>
  </ul>
  <PagerNav :view="view" label="Event history pages" @page="page = $event" />
</template>
