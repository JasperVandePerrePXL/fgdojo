<script setup>
// Sticky top bar with the logo, navigation and the "Join the next event" button.
defineProps({
  /** start.gg link of the next tournament; falls back to the hub page when unknown. */
  nextEventUrl: { type: String, default: null },
});

const HUB_URL = 'https://start.gg/RBHubFGDojo';
</script>

<template>
  <header class="topbar">
    <div class="shell topbar-inner">
      <a class="brand" href="#top"
        ><img src="/fgdlogo.jpg" alt="" width="42" height="42" />Fighting Game Dojo</a
      >
      <nav class="nav" aria-label="Main navigation"><a href="#rankings">Rankings</a></nav>
      <a class="button" :href="nextEventUrl || HUB_URL" target="_blank" rel="noopener noreferrer"
        >Join the next event <span aria-hidden="true">↗</span></a
      >
    </div>
  </header>
</template>
