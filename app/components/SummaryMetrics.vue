<script setup>
// Three headline numbers for the selected season and game.
defineProps({
  playerCount: { type: Number, required: true },
  dojoCount: { type: Number, required: true },
  totalGames: { type: Number, required: true },
});
</script>

<template>
  <div class="summary">
    <div class="metric"><b>{{ playerCount }}</b><span>players ranked</span></div>
    <div class="metric"><b>{{ dojoCount }}</b><span>{{ dojoCount === 1 ? 'dojo in this game' : 'dojos in this game' }}</span></div>
    <div class="metric"><b>{{ totalGames }}</b><span>games recorded</span></div>
  </div>
</template>
