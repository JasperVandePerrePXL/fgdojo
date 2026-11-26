// Pinia store of the player page: loads public/data/players.json and shows the player and game
// named in the URL (`/player.html?id=…&game=…`). Switching games updates the URL so it can be shared.
import { defineStore } from 'pinia';
import { shortDate } from '../utils/chart.js';
import { ordinal, readQuery, updateQuery } from '../utils/url.js';

export const usePlayerStore = defineStore('player', {
  state: () => {
    const query = readQuery(window.location.search);
    return {
      /** The parsed players.json (see PlayerProfiles in src/stats/types.js). */
      profiles: null,
      playerId: query.id ?? null,
      selectedGameId: query.game ?? null,
      loading: true,
      error: null,
    };
  },

  getters: {
    player: (state) => state.profiles?.players?.[state.playerId] ?? null,
    games() {
      return this.player?.games ?? [];
    },
    /** The game from the URL, or the player's most played game. */
    game(state) {
      return this.games.find((game) => game.gameId === state.selectedGameId) ?? this.games[0] ?? null;
    },
    /** Line chart points: rating after each dojo. */
    ratingPoints() {
      return (this.game?.history ?? []).map((point) => ({
        label: shortDate(point.date),
        title: `${point.tournament} · ${point.date ?? 'date unknown'}`,
        value: point.rating,
      }));
    },
    /** Dojo results, newest first. */
    resultRows() {
      return [...(this.game?.results ?? [])].reverse().map((result) => ({
        date: result.date ?? '—',
        dojo: result.tournament,
        placement: result.placement ? `${ordinal(result.placement)} of ${result.entrants}` : '—',
      }));
    },
    /** Rated sets won and lost in the selected game. */
    setRecord() {
      return (this.game?.headToHead ?? []).reduce(
        (total, record) => ({ wins: total.wins + record.wins, losses: total.losses + record.losses }),
        { wins: 0, losses: 0 },
      );
    },
  },

  actions: {
    async load() {
      this.loading = true;
      this.error = null;
      try {
        // Served with no-cache like the other data files, so the browser revalidates it.
        const response = await fetch('/data/players.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.profiles = await response.json();
        if (this.player) document.title = `${this.player.displayName} - FGDojo`;
      } catch {
        this.error = 'Player data is temporarily unavailable.';
      } finally {
        this.loading = false;
      }
    },

    selectGame(gameId) {
      this.selectedGameId = String(gameId);
      const query = updateQuery(window.location.search, { game: this.selectedGameId });
      window.history.replaceState(null, '', `${window.location.pathname}${query}`);
    },
  },
});
