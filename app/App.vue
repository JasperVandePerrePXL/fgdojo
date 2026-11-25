<script setup>
// Page layout. All data and selection state lives in the leaderboard store;
// the visible pieces are separate components in ./components.
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useLeaderboardStore } from './stores/leaderboard.js';
import AppHeader from './components/AppHeader.vue';
import HeroSection from './components/HeroSection.vue';
import RankingControls from './components/RankingControls.vue';
import SummaryMetrics from './components/SummaryMetrics.vue';
import PlayerRanking from './components/PlayerRanking.vue';
import HighlightsPanel from './components/HighlightsPanel.vue';
import EventHistory from './components/EventHistory.vue';
import AppFooter from './components/AppFooter.vue';

const store = useLeaderboardStore();
const { bundle, seasons, selectedSeason, selectedGame, nextEventUrl, loading, error } = storeToRefs(store);

onMounted(store.load);

const latestSeason = computed(() => bundle.value?.seasons?.[String(seasons.value.at(-1))] ?? null);

/** Dojos held across all seasons (hero card). */
const totalDojos = computed(() => Object.values(bundle.value?.seasons ?? {}).reduce(
  (total, season) => total + (season.summary?.totalDojos ?? season.summary?.totalTournaments ?? 0),
  0,
));

const latestPlayers = computed(() => latestSeason.value?.summary?.totalPlayers ?? 0);

/** Date of the most recent event of the selected game. */
const latestDate = computed(() => {
  const dates = (store.gameData?.tournaments ?? []).map((tournament) => tournament.date).filter(Boolean);
  return dates.sort().at(-1) ?? '';
});

/** The selected game across all seasons, used for the "All-time highlights". */
const overallGame = computed(() =>
  bundle.value?.combined?.games?.find((game) => String(game.gameId) === String(store.gameData?.gameId)) ?? store.gameData,
);
</script>

<template>
  <a class="skip" href="#rankings">Skip to rankings</a>

  <AppHeader :next-event-url="nextEventUrl" />

  <main id="top">
    <HeroSection :loading="loading" :total-dojos="totalDojos" :latest-players="latestPlayers" />

    <section class="shell section" id="rankings" aria-labelledby="rankings-title">
      <div class="section-head">
        <div><div class="eyebrow">The leaderboard</div><h2 id="rankings-title">Who's on top?</h2></div>
        <RankingControls
          v-if="bundle"
          :seasons="seasons"
          :selected-season="selectedSeason"
          :games="store.games"
          :selected-game="selectedGame"
          @season-change="store.setSeason"
          @game-change="store.setGame"
        />
      </div>

      <p v-if="loading" class="empty">Loading rankings…</p>
      <p v-else-if="error" class="error">{{ error }}</p>

      <template v-else-if="store.gameData">
        <p v-if="store.rankedPlayers.length === 0" class="empty">No results for this selection yet.</p>
        <template v-else>
          <SummaryMetrics
            :player-count="store.rankedPlayers.length"
            :dojo-count="store.dojoCount"
            :total-games="store.totalGames"
          />

          <div class="layout">
            <PlayerRanking :players="store.rankedPlayers" />
            <HighlightsPanel :players="overallGame?.players ?? []" />
          </div>

          <EventHistory :tournaments="store.gameData.tournaments" />
        </template>
      </template>

      <p v-if="latestDate" class="date-note">Latest result: {{ latestDate }}</p>
    </section>
  </main>

  <AppFooter />
</template>
