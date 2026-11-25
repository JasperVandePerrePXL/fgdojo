<script setup>
// One card per tournament with its date, winner and number of entrants.
defineProps({
  tournaments: { type: Array, required: true },
});
</script>

<template>
  <h2 class="history-title">Event history</h2>
  <ul class="history">
    <li v-for="tournament in tournaments" :key="`${tournament.dojoId}-${tournament.eventName}`" class="card">
      <time>{{ tournament.date || 'Date TBD' }}</time>
      <strong>{{ tournament.name }}</strong>
      <span>🏆 {{ tournament.winner || 'Results pending' }}</span>
      <br /><small>{{ tournament.entrantCount || 0 }} entrants</small>
    </li>
  </ul>
</template>
