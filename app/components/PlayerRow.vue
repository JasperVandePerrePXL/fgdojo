<script setup>
// One line of the ranking: position, name, win rate, record, Elo rating and a win-rate bar.
import { rateClass } from '../utils/format.js';

defineProps({
  player: { type: Object, required: true },
  /** 1-based position in the ranking. */
  rank: { type: Number, required: true },
});
</script>

<template>
  <li class="card row">
    <span class="rank">{{ rank }}</span>
    <span class="player">{{ player.displayName }}</span>
    <span class="rate" :class="rateClass(player.winRateNum)">{{ player.winRate }}%</span>
    <div class="meta">
      <span>{{ player.gamesWon }}W – {{ player.gamesLost }}L</span>
      <span>{{ player.tournamentsAttended }} {{ player.tournamentsAttended === 1 ? 'dojo' : 'dojos' }}</span>
      <span>{{ player.firstPlaces ? `🏆 ${player.firstPlaces}` : 'No wins yet' }}</span>
      <span>Rating {{ player.rating }}</span>
    </div>
    <div class="bar"><i :style="{ width: `${Math.min(100, player.winRateNum)}%` }"></i></div>
  </li>
</template>
