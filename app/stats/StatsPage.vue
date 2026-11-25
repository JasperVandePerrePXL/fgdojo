<script setup>
// The stats page: totals, charts over every dojo, a season comparison and the top rivalries per game.
// All data comes from public/data/stats.json through the stats store.
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useStatsStore } from '../stores/stats.js';
import AppHeader from '../components/AppHeader.vue';
import AppFooter from '../components/AppFooter.vue';
import ChartFrame from '../components/charts/ChartFrame.vue';
import LineChart from '../components/charts/LineChart.vue';
import StackedBarChart from '../components/charts/StackedBarChart.vue';
import DonutChart from '../components/charts/DonutChart.vue';
import RivalryTabs from '../components/RivalryTabs.vue';
import RangeFilter from '../components/RangeFilter.vue';
import PaginatedTable from '../components/PaginatedTable.vue';
import { shortDate } from '../utils/chart.js';

const store = useStatsStore();
const {
  stats,
  loading,
  error,
  dojos,
  gameSeries,
  gamesInRange,
  ranges,
  range,
  totals,
  seasonsInRange,
  rivalryGame,
  attendancePoints,
  entrantsByGameColumns,
  newVsReturningSeries,
  newVsReturningColumns,
} = storeToRefs(store);

onMounted(store.load);

const dojoColumn = { key: 'dojo', label: 'Dojo' };
const seasonColumns = [
  { key: 'seasonName', label: 'Season' },
  { key: 'dojos', label: 'Dojos' },
  { key: 'uniquePlayers', label: 'Players' },
  { key: 'averageAttendance', label: 'Avg. per dojo' },
  { key: 'entrants', label: 'Entries' },
  { key: 'sets', label: 'Sets' },
  { key: 'games', label: 'Games' },
];
/** Table rows: one per dojo, with a readable dojo name. */
const dojoRows = (extra) =>
  dojos.value.map((dojo) => ({ dojo: `${shortDate(dojo.date)} · ${dojo.name}`, ...extra(dojo) }));
</script>

<template>
  <AppHeader home-url="/" :links="[{ href: '/', label: 'Rankings' }]" />

  <main id="top" class="shell stats-page">
    <header class="stats-intro">
      <div class="eyebrow">Behind the brackets</div>
      <h1>Dojo stats</h1>
      <p>Every Fighting Game Dojo tournament of every season, in numbers.</p>
    </header>

    <p v-if="loading" class="empty">Loading stats…</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="stats">
      <RangeFilter :ranges="ranges" :selected="range.id" @select="store.selectRange" />

      <div class="summary four">
        <div class="metric">
          <b>{{ totals.dojos }}</b><span>dojos held</span>
        </div>
        <div class="metric">
          <b>{{ totals.players }}</b><span>different players</span>
        </div>
        <div class="metric">
          <b>{{ totals.sets }}</b><span>sets played</span>
        </div>
        <div class="metric">
          <b>{{ totals.games }}</b><span>games played</span>
        </div>
      </div>

      <ChartFrame
        title="Players per dojo"
        :columns="[dojoColumn, { key: 'players', label: 'Players' }]"
        :rows="dojoRows((dojo) => ({ players: dojo.players }))"
      >
        <LineChart :points="attendancePoints" unit="players" />
      </ChartFrame>

      <ChartFrame
        title="Entrants per game per dojo"
        :series="gamesInRange"
        :columns="[dojoColumn, ...gamesInRange.map((game) => ({ key: game.name, label: game.name }))]"
        :rows="
          dojoRows((dojo) =>
            Object.fromEntries(gamesInRange.map((g) => [g.name, dojo.entrantsByGame[g.name] ?? 0])),
          )
        "
      >
        <StackedBarChart :columns="entrantsByGameColumns" :series="gamesInRange" />
      </ChartFrame>

      <ChartFrame
        title="New vs returning players"
        :series="newVsReturningSeries"
        :columns="[dojoColumn, { key: 'new', label: 'New' }, { key: 'returning', label: 'Returning' }]"
        :rows="dojoRows((dojo) => ({ new: dojo.newPlayers, returning: dojo.returningPlayers }))"
      >
        <StackedBarChart :columns="newVsReturningColumns" :series="newVsReturningSeries" />
      </ChartFrame>

      <div class="stats-grid">
        <ChartFrame
          title="Entrants per game"
          :columns="[
            { key: 'name', label: 'Game' },
            { key: 'value', label: 'Entrants' },
          ]"
          :rows="gamesInRange"
        >
          <DonutChart :parts="gamesInRange" unit="entrants" />
        </ChartFrame>

        <section class="card table-card">
          <h3>Season comparison</h3>
          <PaginatedTable :columns="seasonColumns" :rows="seasonsInRange" label="Season comparison" />
          <p class="note">
            Seasons in the selected period, with numbers for the whole season. Entries count every game a
            player entered; players are counted once per season.
          </p>
        </section>
      </div>

      <RivalryTabs :games="gameSeries" :selected="rivalryGame?.name" @select="store.selectRivalryGame" />
    </template>
  </main>

  <AppFooter />
</template>
