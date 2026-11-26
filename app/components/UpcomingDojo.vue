<script setup>
// "Next dojo" card. Before sign-ups close (13:58 on the dojo day): date, sign-ups per game and a sign-up link.
// After that on the dojo day: "Live now" with a link to each game's bracket. Hidden the day after.
// Data: public/data/next-dojo.json, refreshed every 30 minutes (see README "Live updates").
import { computed } from 'vue';
import { SIGNUPS_CLOSE } from '../../shared/dojo_time.js';

const props = defineProps({
  /** `{ name, url, date, games: { gameName, entrants, url }[] }` (NextDojo in src/stats/types.js). */
  dojo: { type: Object, required: true },
  /** `upcoming` or `live` (dojoPhase in shared/dojo_time.js). */
  phase: { type: String, required: true },
});

const live = computed(() => props.phase === 'live');
const dateLabel = computed(() =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${props.dojo.date}T12:00:00Z`)),
);
</script>

<template>
  <section class="shell" aria-labelledby="next-dojo-title">
    <div class="card next-dojo" :class="{ live }">
      <div>
        <div class="eyebrow">
          <span v-if="live" class="live-dot" aria-hidden="true"></span>{{ live ? 'Live now' : 'Next dojo' }}
        </div>
        <h2 id="next-dojo-title">{{ dojo.name }}</h2>
        <time :datetime="dojo.date">{{ live ? 'Today' : dateLabel }}</time>
      </div>

      <div v-if="live">
        <h3 class="next-dojo-label">Follow the brackets</h3>
        <ul class="next-dojo-games">
          <li v-for="game in dojo.games" :key="game.gameName">
            <a :href="game.url" target="_blank" rel="noopener noreferrer"
              >{{ game.gameName }} <span aria-hidden="true">↗</span></a
            >
          </li>
        </ul>
        <p class="note">Results on this site update every 30 minutes during the dojo.</p>
      </div>
      <div v-else>
        <h3 class="next-dojo-label">Signed up so far</h3>
        <ul class="next-dojo-games">
          <li v-for="game in dojo.games" :key="game.gameName">
            <b>{{ game.entrants }}</b> {{ game.gameName }}
          </li>
        </ul>
        <p class="note">Updated every 30 minutes. Sign-ups close at {{ SIGNUPS_CLOSE }} on the day.</p>
      </div>

      <a class="button" :href="dojo.url" target="_blank" rel="noopener noreferrer"
        >{{ live ? 'Open on start.gg' : 'Sign up on start.gg' }} <span aria-hidden="true">↗</span></a
      >
    </div>
  </section>
</template>
