<script setup>
// Head-to-head records of one player in one game: the TOP_COUNT most played opponents.
// Opponent names link to their page.
import { computed } from 'vue';
import { playerUrl } from '../utils/url.js';

/** Opponents shown. */
const TOP_COUNT = 5;

const props = defineProps({
  /** `{ opponentId, opponentName, wins, losses }[]`, most played first. */
  records: { type: Array, required: true },
  /** Game of the records; opponent links open on the same game. */
  gameId: { type: String, required: true },
});

const top = computed(() => props.records.slice(0, TOP_COUNT));
</script>

<template>
  <section class="card table-card">
    <h3>Head-to-head</h3>
    <ol v-if="top.length" class="rivalries h2h">
      <li v-for="record in top" :key="record.opponentId">
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
    <p class="note">
      Top {{ TOP_COUNT }} most played opponents: sets won – lost, across all seasons (disqualifications
      excluded).
    </p>
  </section>
</template>
