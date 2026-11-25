<script setup>
// Side panel with the all-time top lists (most wins, best win rate, most attendance).
import HighlightList from './HighlightList.vue';
import { MIN_GAMES_FOR_WIN_RATE, topPlayers } from '../utils/format.js';

defineProps({
  /** Players of the selected game across all seasons. */
  players: { type: Array, default: () => [] },
});

const hasEnoughGames = (player) => player.gamesWon + player.gamesLost >= MIN_GAMES_FOR_WIN_RATE;
</script>

<template>
  <aside class="card side">
    <h3>All-time highlights</h3>
    <div class="side-section">
      <small class="eyebrow">Most wins</small>
      <HighlightList :items="topPlayers(players, (player) => player.firstPlaces)" value-key="firstPlaces" suffix="" />
    </div>
    <div class="side-section">
      <small class="eyebrow">Best win rate</small>
      <HighlightList :items="topPlayers(players, (player) => player.winRateNum, hasEnoughGames)" value-key="winRate" suffix="%" />
    </div>
    <div class="side-section">
      <small class="eyebrow">Most attendance</small>
      <HighlightList :items="topPlayers(players, (player) => player.tournamentsAttended)" value-key="tournamentsAttended" suffix="" />
    </div>
  </aside>
</template>
