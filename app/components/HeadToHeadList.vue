<script setup>
// Head-to-head records of one player in one game, 10 opponents per page. Opponent names link to their page.
import { computed, ref, watch } from 'vue';
import { paginate } from '../utils/pagination.js';
import { playerUrl } from '../utils/url.js';

const props = defineProps({
  /** `{ opponentId, opponentName, wins, losses }[]`, most played first. */
  records: { type: Array, required: true },
  /** Game of the records; opponent links open on the same game. */
  gameId: { type: String, required: true },
});

const page = ref(1);
watch(
  () => props.records,
  () => (page.value = 1),
);
const view = computed(() => paginate(props.records, page.value));
</script>

<template>
  <section class="card table-card">
    <h3>Head-to-head</h3>
    <ol v-if="records.length" class="rivalries h2h">
      <li v-for="record in view.rows" :key="record.opponentId">
        <a class="side-b" :href="playerUrl(record.opponentId, gameId)">{{ record.opponentName }}</a>
        <b
          ><span :class="{ leads: record.wins > record.losses }">{{ record.wins }}</span> –
          <span :class="{ leads: record.losses > record.wins }">{{ record.losses }}</span></b
        >
        <small
          >{{ record.wins + record.losses }} {{ record.wins + record.losses === 1 ? 'set' : 'sets' }}</small
        >
      </li>
    </ol>
    <p v-else class="empty compact">No rated sets in this game yet.</p>
    <nav v-if="view.pageCount > 1" class="pager" aria-label="Head-to-head pages">
      <button type="button" :disabled="view.page === 1" @click="page = view.page - 1">‹ Previous</button>
      <span aria-live="polite">{{ view.first }}–{{ view.last }} of {{ view.total }}</span>
      <button type="button" :disabled="view.page === view.pageCount" @click="page = view.page + 1">
        Next ›
      </button>
    </nav>
    <p class="note">
      Sets won – lost against each opponent, across all seasons (disqualifications excluded).
    </p>
  </section>
</template>
