<script setup>
// Page layout. All data, selection state and derived values live in the leaderboard store;
// the visible pieces are separate components in ./components.
import { onMounted } from 'vue';
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
const {
  bundle,
  seasonOptions,
  selectedSeason,
  selectedGame,
  nextEventUrl,
  loading,
  error,
  games,
  gameData,
  rankedPlayers,
  dojoCount,
  totalGames,
  totalDojos,
  latestSeasonPlayers,
  latestResultDate,
  allTimeFunStats,
} = storeToRefs(store);

onMounted(store.load);
</script>

<template>
  <a class="skip" href="#rankings">Skip to rankings</a>

  <AppHeader :next-event-url="nextEventUrl" />

  <main id="top">
    <HeroSection :loading="loading" :total-dojos="totalDojos" :latest-players="latestSeasonPlayers" />

    <section id="rankings" class="shell section" aria-labelledby="rankings-title">
      <div class="section-head">
        <div>
          <div class="eyebrow">The leaderboard</div>
          <h2 id="rankings-title">Who's on top?</h2>
        </div>
        <RankingControls
          v-if="bundle"
          :seasons="seasonOptions"
          :selected-season="selectedSeason"
          :games="games"
          :selected-game="selectedGame"
          @season-change="store.setSeason"
          @game-change="store.setGame"
        />
      </div>

      <p v-if="loading" class="empty">Loading rankings…</p>
      <p v-else-if="error" class="error">{{ error }}</p>

      <template v-else-if="gameData">
        <p v-if="rankedPlayers.length === 0" class="empty">
          No ranked players yet: players appear in the ranking after 2 dojos.
        </p>
        <template v-else>
          <SummaryMetrics
            :player-count="rankedPlayers.length"
            :dojo-count="dojoCount"
            :total-games="totalGames"
          />

          <div class="layout">
            <PlayerRanking :players="rankedPlayers" />
            <HighlightsPanel :fun-stats="allTimeFunStats" />
          </div>

          <EventHistory :tournaments="gameData.tournaments" />
        </template>
      </template>

      <p v-if="latestResultDate" class="date-note">Latest result: {{ latestResultDate }}</p>
    </section>
  </main>

  <AppFooter />
</template>
