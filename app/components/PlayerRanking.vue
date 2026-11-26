<script setup>
// The ordered list of players (already sorted by the store), RANKING_PAGE_SIZE per page.
// Rank numbers stay the real position on every page; a new season or game starts at page 1.
import { computed, ref, watch } from 'vue';
import { paginate } from '../utils/pagination.js';
import PlayerRow from './PlayerRow.vue';
import PagerNav from './PagerNav.vue';

/** Players per page. */
const RANKING_PAGE_SIZE = 10;

const props = defineProps({
  players: { type: Array, required: true },
  /** Passed to each row for the player page link. */
  gameId: { type: String, default: null },
});

const page = ref(1);
watch(
  () => props.players,
  () => (page.value = 1),
);
const view = computed(() => paginate(props.players, page.value, RANKING_PAGE_SIZE));
</script>

<template>
  <div>
    <ol class="board" aria-label="Player rankings" :start="view.first">
      <PlayerRow
        v-for="(player, index) in view.rows"
        :key="player.playerId"
        :player="player"
        :rank="view.first + index"
        :game-id="gameId"
      />
    </ol>
    <PagerNav :view="view" label="Player rankings pages" @page="page = $event" />
  </div>
</template>
