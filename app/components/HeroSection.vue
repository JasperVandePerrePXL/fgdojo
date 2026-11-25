<script setup>
// Title block with the two headline numbers.
defineProps({
  loading: { type: Boolean, default: false },
  totalDojos: { type: Number, default: 0 },
  latestPlayers: { type: Number, default: 0 },
});
</script>

<template>
  <section class="shell hero" aria-labelledby="title">
    <div>
      <div class="eyebrow">Belgian FGC · Learning · Improving · Supporting</div>
      <h1 id="title">Train hard.<br /><em>Rank higher.</em></h1>
      <p>Results from every Fighting Game Dojo edition, brought together in one place. Choose a season and game to see the competition.</p>
    </div>
    <div class="hero-card">
      <strong>{{ loading ? '—' : totalDojos }}</strong><span>dojos held across all seasons</span>
      <strong>{{ loading ? '—' : latestPlayers }}</strong><span>players represented in the latest season</span>
    </div>
  </section>
</template>
