<script setup>
// The season and game drop-downs. Selection changes are reported to the parent, which owns the state.
defineProps({
  /** `{ id, label }[]`, including "All seasons". */
  seasons: { type: Array, required: true },
  selectedSeason: { type: [String, Number], default: null },
  games: { type: Array, required: true },
  selectedGame: { type: [String, Number], default: null },
});
defineEmits(['season-change', 'game-change']);
</script>

<template>
  <div class="controls">
    <div class="field">
      <label for="season">Season</label>
      <select id="season" :value="selectedSeason" @change="$emit('season-change', $event.target.value)">
        <option v-for="season in seasons" :key="season.id" :value="season.id">{{ season.label }}</option>
      </select>
    </div>
    <div class="field">
      <label for="game">Game</label>
      <select id="game" :value="selectedGame" @change="$emit('game-change', $event.target.value)">
        <option v-for="game in games" :key="game.gameId" :value="game.gameId">{{ game.gameName }}</option>
      </select>
    </div>
  </div>
</template>
