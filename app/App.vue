<script setup>
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useLeaderboardStore } from './stores/leaderboard.js';
import HighlightList from './components/HighlightList.vue';

const store = useLeaderboardStore();
const { bundle, seasons, selectedSeason, selectedGame, loading, error } = storeToRefs(store);

onMounted(store.load);

const latestSeason = computed(() => bundle.value?.seasons?.[String(seasons.value.at(-1))] ?? null);
const totalDojos = computed(() => Object.values(bundle.value?.seasons ?? {}).reduce(
  (total, season) => total + (season.summary?.totalDojos ?? season.summary?.totalTournaments ?? 0),
  0
));
const latestPlayers = computed(() => latestSeason.value?.summary?.totalPlayers ?? 0);
const latestDate = computed(() => {
  const dates = (store.gameData?.tournaments ?? []).map((tournament) => tournament.date).filter(Boolean);
  return dates.sort().at(-1) ?? '';
});
const overallGame = computed(() =>
  bundle.value?.combined?.games?.find((game) => String(game.gameId) === String(store.gameData?.gameId)) ?? store.gameData
);

function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function topPlayers(players, value, filter = () => true) {
  return [...players].filter(filter).sort((a, b) => value(b) - value(a)).slice(0, 3);
}

function rateClass(rate) {
  return rate >= 60 ? 'high' : rate >= 45 ? 'medium' : 'low';
}
</script>

<template>
  <a class="skip" href="#rankings">Skip to rankings</a>

  <header class="topbar">
    <div class="shell topbar-inner">
      <a class="brand" href="#top"><img src="/fgdlogo.jpg" alt="" width="42" height="42" />Fighting Game Dojo</a>
      <nav class="nav" aria-label="Main navigation"><a href="#rankings">Rankings</a></nav>
      <a class="button" href="https://start.gg/RBHubFGDojo" target="_blank" rel="noopener noreferrer">Join the next event <span aria-hidden="true">↗</span></a>
    </div>
  </header>

  <main id="top">
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

    <section class="shell section" id="rankings" aria-labelledby="rankings-title">
      <div class="section-head">
        <div><div class="eyebrow">The leaderboard</div><h2 id="rankings-title">Who's on top?</h2></div>
        <div class="controls" v-if="bundle">
          <div class="field">
            <label for="season">Season</label>
            <select id="season" :value="selectedSeason" @change="store.setSeason($event.target.value)">
              <option v-for="season in seasons" :key="season" :value="season">Season {{ season }}</option>
            </select>
          </div>
          <div class="field">
            <label for="game">Game</label>
            <select id="game" :value="selectedGame" @change="store.setGame($event.target.value)">
              <option v-for="game in store.games" :key="game.gameId" :value="game.gameId">{{ game.gameName }}</option>
            </select>
          </div>
        </div>
      </div>

      <p v-if="loading" class="empty">Loading rankings…</p>
      <p v-else-if="error" class="error">{{ error }}</p>

      <template v-else-if="store.gameData">
        <p v-if="store.rankedPlayers.length === 0" class="empty">No results for this selection yet.</p>
        <template v-else>
          <div class="summary">
            <div class="metric"><b>{{ store.rankedPlayers.length }}</b><span>players ranked</span></div>
            <div class="metric"><b>{{ store.dojoCount }}</b><span>{{ store.dojoCount === 1 ? 'dojo in this game' : 'dojos in this game' }}</span></div>
            <div class="metric"><b>{{ store.totalGames }}</b><span>games recorded</span></div>
          </div>

          <div class="layout">
            <ol class="board" aria-label="Player rankings">
              <li v-for="(player, index) in store.rankedPlayers" :key="player.playerId" class="card row">
                <span class="rank">{{ index + 1 }}</span>
                <span class="player">{{ player.displayName }}</span>
                <span class="rate" :class="rateClass(player.winRateNum)">{{ player.winRate }}%</span>
                <div class="meta">
                  <span>{{ player.gamesWon }}W – {{ player.gamesLost }}L</span>
                  <span>{{ player.tournamentsAttended }} {{ player.tournamentsAttended === 1 ? 'dojo' : 'dojos' }}</span>
                  <span>{{ player.firstPlaces ? `🏆 ${player.firstPlaces}` : 'No wins yet' }}</span>
                  <span>Score {{ player.rankingScore?.toFixed ? player.rankingScore.toFixed(1) : player.rankingScore }}</span>
                </div>
                <div class="bar"><i :style="{ width: `${Math.min(100, player.winRateNum)}%` }"></i></div>
              </li>
            </ol>

            <aside class="card side">
              <h3>All-time highlights</h3>
              <div class="side-section">
                <small class="eyebrow">Most wins</small>
                <HighlightList :items="topPlayers(overallGame?.players ?? [], (player) => player.firstPlaces)" value-key="firstPlaces" suffix="" />
              </div>
              <div class="side-section">
                <small class="eyebrow">Best win rate</small>
                <HighlightList :items="topPlayers(overallGame?.players ?? [], (player) => player.winRateNum, (player) => player.gamesWon + player.gamesLost >= 10)" value-key="winRate" suffix="%" />
              </div>
              <div class="side-section">
                <small class="eyebrow">Most attendance</small>
                <HighlightList :items="topPlayers(overallGame?.players ?? [], (player) => player.tournamentsAttended)" value-key="tournamentsAttended" suffix="" />
              </div>
            </aside>
          </div>

          <h2 class="history-title">Event history</h2>
          <ul class="history">
            <li v-for="tournament in store.gameData.tournaments" :key="`${tournament.dojoId}-${tournament.eventName}`" class="card">
              <time>{{ tournament.date || 'Date TBD' }}</time>
              <strong>{{ tournament.name }}</strong>
              <span>🏆 {{ tournament.winner || 'Results pending' }}</span>
              <br /><small>{{ tournament.entrantCount || 0 }} entrants</small>
            </li>
          </ul>
        </template>
      </template>

      <p v-if="latestDate" class="date-note">Latest result: {{ latestDate }}</p>
    </section>
  </main>

  <footer><div class="shell">Fighting Game Dojo · data from start.gg</div></footer>
</template>
