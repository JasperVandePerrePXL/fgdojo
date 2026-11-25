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
import { shortDate } from '../utils/chart.js';

const store = useStatsStore();
const {
  stats,
  loading,
  error,
  dojos,
  gameSeries,
  rivalryGame,
  attendancePoints,
  entrantsByGameColumns,
  newVsReturningSeries,
  newVsReturningColumns,
} = storeToRefs(store);

onMounted(store.load);

const dojoColumn = { key: 'dojo', label: 'Dojo' };
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
      <div class="summary four">
        <div class="metric">
          <b>{{ stats.totals.dojos }}</b><span>dojos held</span>
        </div>
        <div class="metric">
          <b>{{ stats.totals.players }}</b><span>different players</span>
        </div>
        <div class="metric">
          <b>{{ stats.totals.sets }}</b><span>sets played</span>
        </div>
        <div class="metric">
          <b>{{ stats.totals.games }}</b><span>games played</span>
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
        :series="gameSeries"
        :columns="[dojoColumn, ...gameSeries.map((game) => ({ key: game.name, label: game.name }))]"
        :rows="
          dojoRows((dojo) =>
            Object.fromEntries(gameSeries.map((g) => [g.name, dojo.entrantsByGame[g.name] ?? 0])),
          )
        "
      >
        <StackedBarChart :columns="entrantsByGameColumns" :series="gameSeries" />
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
          title="Entrants per game, all dojos"
          :columns="[
            { key: 'name', label: 'Game' },
            { key: 'value', label: 'Entrants' },
          ]"
          :rows="gameSeries"
        >
          <DonutChart :parts="gameSeries" unit="entrants" />
        </ChartFrame>

        <section class="card table-card">
          <h3>Season comparison</h3>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Season</th>
                  <th scope="col">Dojos</th>
                  <th scope="col">Players</th>
                  <th scope="col">Avg. per dojo</th>
                  <th scope="col">Entries</th>
                  <th scope="col">Sets</th>
                  <th scope="col">Games</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="season in stats.seasons" :key="season.seasonId">
                  <th scope="row">{{ season.seasonName }}</th>
                  <td>{{ season.dojos }}</td>
                  <td>{{ season.uniquePlayers }}</td>
                  <td>{{ season.averageAttendance }}</td>
                  <td>{{ season.entrants }}</td>
                  <td>{{ season.sets }}</td>
                  <td>{{ season.games }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="note">Entries count every game a player entered; players are counted once per season.</p>
        </section>
      </div>

      <RivalryTabs :games="gameSeries" :selected="rivalryGame?.name" @select="store.selectRivalryGame" />
    </template>
  </main>

  <AppFooter />
</template>
