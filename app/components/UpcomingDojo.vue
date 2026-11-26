<script setup>
// "Next dojo" card: name, date, sign-ups per game (as of the last data update) and a link to start.gg.
// Only shown while the dojo has not been played yet (see the leaderboard store).
import { computed } from 'vue';

const props = defineProps({
  /** `{ name, url, date, games: { gameName, entrants }[] }` (UpcomingDojo in src/stats/types.js). */
  dojo: { type: Object, required: true },
});

const dateLabel = computed(() =>
  props.dojo.date
    ? new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${props.dojo.date}T12:00:00Z`))
    : 'Date to be announced',
);
</script>

<template>
  <section class="shell" aria-labelledby="next-dojo-title">
    <div class="card next-dojo">
      <div>
        <div class="eyebrow">Next dojo</div>
        <h2 id="next-dojo-title">{{ dojo.name }}</h2>
        <time :datetime="dojo.date">{{ dateLabel }}</time>
      </div>
      <div>
        <h3 class="next-dojo-label">Signed up so far</h3>
        <ul class="next-dojo-games">
          <li v-for="game in dojo.games" :key="game.gameName">
            <b>{{ game.entrants }}</b> {{ game.gameName }}
          </li>
        </ul>
        <p class="note">Updated after each weekend; start.gg has the live list.</p>
      </div>
      <a class="button" :href="dojo.url" target="_blank" rel="noopener noreferrer"
        >Sign up on start.gg <span aria-hidden="true">↗</span></a
      >
    </div>
  </section>
</template>
