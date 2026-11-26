<script setup>
// The ordered list of players (already sorted by the store).
import PlayerRow from './PlayerRow.vue';

defineProps({
  players: { type: Array, required: true },
  /** Passed to each row for the player page link. */
  gameId: { type: String, default: null },
});
</script>

<template>
  <ol class="board" aria-label="Player rankings">
    <PlayerRow
      v-for="(player, index) in players"
      :key="player.playerId"
      :player="player"
      :rank="index + 1"
      :game-id="gameId"
    />
  </ol>
</template>
