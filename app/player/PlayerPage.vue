<script setup>
// The player page: Elo rating over time, dojo results and head-to-head records, one game at a time.
// All data comes from public/data/players.json through the player store.
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlayerStore } from '../stores/player.js';
import AppHeader from '../components/AppHeader.vue';
import AppFooter from '../components/AppFooter.vue';
import ChartFrame from '../components/charts/ChartFrame.vue';
import LineChart from '../components/charts/LineChart.vue';
import PaginatedTable from '../components/PaginatedTable.vue';
import HeadToHeadList from '../components/HeadToHeadList.vue';

const store = usePlayerStore();
const { player, games, game, ratingPoints, resultRows, setRecord, loading, error } = storeToRefs(store);

onMounted(store.load);

const ratingColumns = [
  { key: 'dojo', label: 'Dojo' },
  { key: 'rating', label: 'Rating after' },
];
// Placement before the (long) dojo name, so it stays visible on small screens.
const resultColumns = [
  { key: 'date', label: 'Date' },
  { key: 'placement', label: 'Placement' },
  { key: 'dojo', label: 'Dojo' },
];

/** Arrow keys move between game tabs (standard tablist keyboard behaviour). */
function onTabKeydown(event, index) {
  const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
  if (!step) return;
  const next = games.value[(index + step + games.value.length) % games.value.length];
  store.selectGame(next.gameId);
  event.currentTarget.parentElement.children[games.value.indexOf(next)]?.focus();
}
</script>

<template>
  <AppHeader
    home-url="/"
    :links="[
      { href: '/', label: 'Rankings' },
      { href: '/stats.html', label: 'Stats' },
    ]"
  />

  <main id="top" class="shell stats-page">
    <p v-if="loading" class="empty">Loading player…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else-if="!player" class="empty">Player not found. <a href="/">Back to the rankings</a></div>

    <template v-else>
      <header class="stats-intro">
        <div class="eyebrow">Player</div>
        <h1>{{ player.displayName }}</h1>
      </header>

      <div v-if="games.length > 1" class="tabs player-games" role="tablist" aria-label="Game">
        <button
          v-for="(item, index) in games"
          :key="item.gameId"
          type="button"
          role="tab"
          class="tab"
          :aria-selected="item.gameId === game?.gameId"
          aria-controls="player-game"
          :tabindex="item.gameId === game?.gameId ? 0 : -1"
          @click="store.selectGame(item.gameId)"
          @keydown="onTabKeydown($event, index)"
        >
          {{ item.gameName }}
        </button>
      </div>

      <section v-if="game" id="player-game" :role="games.length > 1 ? 'tabpanel' : null">
        <h2 v-if="games.length === 1" class="player-game-name">{{ game.gameName }}</h2>
        <div class="summary">
          <div class="metric">
            <b>{{ game.rating ?? '—' }}</b><span>rating</span>
          </div>
          <div class="metric">
            <b>{{ game.results.length }}</b><span>{{ game.results.length === 1 ? 'dojo' : 'dojos' }}</span>
          </div>
          <div class="metric">
            <b>{{ setRecord.wins }}–{{ setRecord.losses }}</b
            ><span>sets won–lost</span>
          </div>
        </div>

        <div class="player-grid">
          <ChartFrame
            title="Rating over time"
            :columns="ratingColumns"
            :rows="
              game.history.map((point) => ({
                dojo: `${point.date} · ${point.tournament}`,
                rating: point.rating,
              }))
            "
          >
            <LineChart v-if="ratingPoints.length" :points="ratingPoints" unit="rating" :zero-based="false" />
            <p v-else class="empty compact">No rated sets in this game yet.</p>
          </ChartFrame>

          <HeadToHeadList :records="game.headToHead" :game-id="game.gameId" />

          <section class="card table-card">
            <h3>Dojo results</h3>
            <PaginatedTable :columns="resultColumns" :rows="resultRows" label="Dojo results" />
          </section>
        </div>
        <p class="note">
          Rating = Elo rating in this game after each dojo, carried over between seasons. Every player starts
          at 1500.
        </p>
      </section>
    </template>
  </main>

  <AppFooter />
</template>
