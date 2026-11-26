// Pinia store of the stats page: loads public/data/stats.json, tracks the selected date range
// and shapes the data of that range for the charts and tables. Rivalries are always all-time.
import { defineStore } from 'pinia';
import { seriesColor, shortDate } from '../utils/chart.js';
import { ALL_TIME, buildDateRanges } from '../utils/ranges.js';

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
    /** ID of the selected date range (see utils/ranges.js). */
    selectedRange: ALL_TIME,
  }),

  getters: {
    /** All time, each year and each half year that has dojos. */
    ranges: (state) => buildDateRanges((state.stats?.dojos ?? []).map((dojo) => dojo.date)),
    range() {
      return this.ranges.find((range) => range.id === this.selectedRange) ?? this.ranges[0];
    },
    /** Dojos in the selected range, oldest first. */
    dojos() {
      return (this.stats?.dojos ?? []).filter((dojo) => this.range.contains(dojo.date));
    },
    /** Totals of the selected range; players are counted once even when they attended several dojos. */
    totals() {
      return {
        dojos: this.dojos.length,
        players: new Set(this.dojos.flatMap((dojo) => dojo.playerIds ?? [])).size,
        sets: this.dojos.reduce((sum, dojo) => sum + (dojo.sets ?? 0), 0),
        games: this.dojos.reduce((sum, dojo) => sum + (dojo.games ?? 0), 0),
      };
    },
    /**
     * Games with a fixed color each, in order of first appearance (color follows the game, also when a range
     * hides some games). `value` = entrants in the selected range; `rivalries` are all-time.
     */
    gameSeries() {
      return (this.stats?.games ?? []).map((game, index) => ({
        name: game.gameName,
        value: this.dojos.reduce((sum, dojo) => sum + (dojo.entrantsByGame[game.gameName] ?? 0), 0),
        color: seriesColor(index),
        rivalries: game.rivalries ?? [],
      }));
    },
    /** Games played in the selected range (for the donut and the per-game chart). */
    gamesInRange() {
      return this.gameSeries.filter((game) => game.value > 0);
    },
    /** Seasons that have at least one dojo in the selected range. */
    seasonsInRange() {
      const seasonIds = new Set(this.dojos.map((dojo) => dojo.seasonId));
      return (this.stats?.seasons ?? []).filter((season) => seasonIds.has(season.seasonId));
    },
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
        values: this.gamesInRange.map((game) => dojo.entrantsByGame[game.name] ?? 0),
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
    selectRange(rangeId) {
      this.selectedRange = rangeId;
    },

    selectRivalryGame(gameName) {
      this.selectedRivalryGame = gameName;
    },

    async load() {
      this.loading = true;
      this.error = null;
      try {
        // The deploy serves /data/ with no-cache, so the browser revalidates (cheap 304) instead of re-downloading.
        const response = await fetch('/data/stats.json');
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
