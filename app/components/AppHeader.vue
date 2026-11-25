<script setup>
// Sticky top bar with the logo, navigation and the "Join the next event" button.
defineProps({
  /** start.gg link of the next tournament; falls back to the hub page when unknown. */
  nextEventUrl: { type: String, default: null },
  /** Target of the logo link. */
  homeUrl: { type: String, default: '#top' },
  /** Navigation links, `{ href, label }[]`. */
  links: { type: Array, default: () => [{ href: '/stats.html', label: 'Stats' }] },
});

const HUB_URL = 'https://start.gg/RBHubFGDojo';
</script>

<template>
  <header class="topbar">
    <div class="shell topbar-inner">
      <a class="brand" :href="homeUrl"
        ><img src="/fgdlogo.jpg" alt="" width="42" height="42" />Fighting Game Dojo</a
      >
      <nav class="nav" aria-label="Main navigation">
        <a v-for="link in links" :key="link.href" :href="link.href">{{ link.label }}</a>
      </nav>
      <a class="button" :href="nextEventUrl || HUB_URL" target="_blank" rel="noopener noreferrer"
        >Join the next event <span aria-hidden="true">↗</span></a
      >
    </div>
  </header>
</template>
