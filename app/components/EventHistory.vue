<script setup>
// One card per tournament with its date, winner and number of entrants: newest first, 8 per page on a computer
// and 5 on a phone. A new season or game starts at page 1.
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { paginate } from '../utils/pagination.js';
import PagerNav from './PagerNav.vue';

/** Cards per page on a computer and on a phone. */
const HISTORY_PAGE_SIZE = { desktop: 8, phone: 5 };
/** Same breakpoint as the mobile layout in styles.css. */
const PHONE_QUERY = window.matchMedia('(max-width: 760px)');

const props = defineProps({
  /** TournamentInfo[], oldest first (as stored). */
  tournaments: { type: Array, required: true },
});

const newestFirst = computed(() => [...props.tournaments].reverse());
const isPhone = ref(PHONE_QUERY.matches);
const onScreenChange = (event) => (isPhone.value = event.matches);
PHONE_QUERY.addEventListener('change', onScreenChange);
onBeforeUnmount(() => PHONE_QUERY.removeEventListener('change', onScreenChange));
const pageSize = computed(() => (isPhone.value ? HISTORY_PAGE_SIZE.phone : HISTORY_PAGE_SIZE.desktop));

const page = ref(1);
// Back to page 1 for another season/game, or when the page size changes (e.g. rotating a tablet).
watch([() => props.tournaments, pageSize], () => (page.value = 1));
const view = computed(() => paginate(newestFirst.value, page.value, pageSize.value));
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
