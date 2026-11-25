// Pinia store of the stats page: loads public/data/stats.json and shapes it for the charts.
import { defineStore } from 'pinia';
import { seriesColor, shortDate } from '../utils/chart.js';

/** Tooltip/axis label of a dojo. */
const dojoLabel = (dojo) => ({
  label: shortDate(dojo.date),
  title: `${dojo.name} · ${dojo.date ?? 'date unknown'}`,
});

export const useStatsStore = defineStore('stats', {
  state: () => ({
    /** The parsed stats.json (see SiteStats in src/stats/types.js). */
    stats: null,
    loading: true,
    error: null,
    /** Game whose rivalries are shown (defaults to the first game). */
    selectedRivalryGame: null,
  }),

  getters: {
    dojos: (state) => state.stats?.dojos ?? [],
    /** Games with a fixed color each, in order of first appearance (color follows the game). */
    gameSeries: (state) =>
      (state.stats?.games ?? []).map((game, index) => ({
        name: game.gameName,
        value: game.entrants,
        color: seriesColor(index),
        rivalries: game.rivalries ?? [],
      })),
    /** The game whose rivalry tab is open. */
    rivalryGame() {
      return (
        this.gameSeries.find((game) => game.name === this.selectedRivalryGame) ?? this.gameSeries[0] ?? null
      );
    },
    /** Unique players per dojo, oldest first. */
    attendancePoints() {
      return this.dojos.map((dojo) => ({ ...dojoLabel(dojo), value: dojo.players }));
    },
    /** Entrants per game per dojo, one value per game series. */
    entrantsByGameColumns() {
      return this.dojos.map((dojo) => ({
        ...dojoLabel(dojo),
        values: this.gameSeries.map((game) => dojo.entrantsByGame[game.name] ?? 0),
      }));
    },
    newVsReturningSeries: () => [
      { name: 'New players', color: seriesColor(0) },
      { name: 'Returning players', color: seriesColor(1) },
    ],
    newVsReturningColumns() {
      return this.dojos.map((dojo) => ({
        ...dojoLabel(dojo),
        values: [dojo.newPlayers, dojo.returningPlayers],
      }));
    },
  },

  actions: {
    selectRivalryGame(gameName) {
      this.selectedRivalryGame = gameName;
    },

    async load() {
      this.loading = true;
      this.error = null;
      try {
        // The timestamp avoids a stale cached copy after a new deployment.
        const response = await fetch(`/data/stats.json?v=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.stats = await response.json();
      } catch {
        this.error = 'Stats are temporarily unavailable.';
      } finally {
        this.loading = false;
      }
    },
  },
});
