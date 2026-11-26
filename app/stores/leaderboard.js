// Pinia store: loads public/data/leaderboards.json and tracks the selected season and game.
// The selection is remembered in localStorage between visits.
import { defineStore } from 'pinia';
import { readStorage, writeStorage } from '../utils/storage.js';
import { ALL_SEASONS_ID, pickSeason } from '../utils/selection.js';
import { dojoKeyOf } from '../../shared/rules.js';

const SEASON_STORAGE_KEY = 'fgdojo.selectedSeason';
const GAME_STORAGE_KEY = 'fgdojo.selectedGame';
/** Pseudo game used for seasons whose data has no per-game breakdown. */
const ALL_GAMES_ID = 'all';

export const useLeaderboardStore = defineStore('leaderboard', {
  state: () => ({
    /** The parsed leaderboards.json: `{ nextEventUrl, seasons, combined }`. */
    bundle: null,
    nextEventUrl: null,
    /** Season IDs (numbers), ascending. */
    seasons: [],
    selectedSeason: readStorage(SEASON_STORAGE_KEY),
    selectedGame: readStorage(GAME_STORAGE_KEY),
    /** Games of the selected season (kept in state so the game list updates with the season). */
    currentGames: [],
    loading: true,
    error: null,
  }),

  getters: {
    /** The full leaderboard object of the selected season. */
    seasonData(state) {
      if (state.selectedSeason === ALL_SEASONS_ID) return state.bundle?.combined ?? null;
      return state.bundle?.seasons?.[state.selectedSeason] ?? null;
    },
    /** Season drop-down entries: "All seasons" (every dojo combined) first, then each season. */
    seasonOptions(state) {
      if (!state.seasons.length) return [];
      return [
        { id: ALL_SEASONS_ID, label: 'All seasons' },
        ...state.seasons.map((id) => ({ id: String(id), label: `Season ${id}` })),
      ];
    },
    games(state) {
      return state.currentGames;
    },
    /** The selected game, or the first game when the selection is no longer valid. */
    gameData(state) {
      return (
        this.games.find((game) => String(game.gameId) === String(state.selectedGame)) ?? this.games[0] ?? null
      );
    },
    /**
     * Ranked players (2+ dojos, see MIN_DOJOS_FOR_RANKING) of the selected game, highest Elo rating first;
     * ties broken by win rate, attendance and wins.
     */
    rankedPlayers() {
      return (this.gameData?.players ?? [])
        .filter((player) => player.ranked)
        .sort(
          (a, b) =>
            (b.rating ?? 0) - (a.rating ?? 0) ||
            b.winRateNum - a.winRateNum ||
            b.tournamentsAttended - a.tournamentsAttended ||
            b.firstPlaces - a.firstPlaces,
        );
    },
    /** Number of dojos (tournament days) that had the selected game. */
    dojoCount() {
      return new Set((this.gameData?.tournaments ?? []).map(dojoKeyOf)).size;
    },
    /** Total games (set score points) played by all players of the selected game. */
    totalGames() {
      return (this.gameData?.players ?? []).reduce(
        (total, player) => total + player.gamesWon + player.gamesLost,
        0,
      );
    },
    /** Date (`YYYY-MM-DD`) of the most recent event of the selected game, or ''. */
    latestResultDate() {
      const dates = (this.gameData?.tournaments ?? []).map((tournament) => tournament.date).filter(Boolean);
      return dates.sort().at(-1) ?? '';
    },
    /** Dojos held across all seasons (hero card). */
    totalDojos(state) {
      return Object.values(state.bundle?.seasons ?? {}).reduce(
        (total, season) => total + (season.summary?.totalDojos ?? 0),
        0,
      );
    },
    /** Players in the most recent season (hero card). */
    latestSeasonPlayers(state) {
      return state.bundle?.seasons?.[String(state.seasons.at(-1))]?.summary?.totalPlayers ?? 0;
    },
    /** Highlights of the selected game across all seasons, falling back to the selected season. */
    allTimeFunStats(state) {
      const gameId = String(this.gameData?.gameId);
      const combinedGame = state.bundle?.combined?.games?.find((game) => String(game.gameId) === gameId);
      return combinedGame?.funStats ?? this.gameData?.funStats ?? {};
    },
  },

  actions: {
    /** Downloads leaderboards.json and selects the remembered (or latest) season. */
    async load() {
      this.loading = true;
      this.error = null;
      try {
        // The deploy serves /data/ with no-cache, so the browser revalidates (cheap 304) instead of re-downloading.
        const response = await fetch('/data/leaderboards.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        this.bundle = await response.json();
        this.nextEventUrl = this.bundle.nextEventUrl || null;
        this.seasons = Object.keys(this.bundle.seasons || {})
          .map(Number)
          .sort((a, b) => a - b);

        this.selectedSeason = pickSeason(this.seasons, this.selectedSeason);
        writeStorage(SEASON_STORAGE_KEY, this.selectedSeason);
        this.refreshCurrentGames();
        this.ensureValidGame();
      } catch {
        this.error = 'Leaderboard data is temporarily unavailable.';
      } finally {
        this.loading = false;
      }
    },

    setSeason(seasonId) {
      this.selectedSeason = String(seasonId);
      writeStorage(SEASON_STORAGE_KEY, this.selectedSeason);
      this.refreshCurrentGames();
      this.ensureValidGame();
    },

    setGame(gameId) {
      this.selectedGame = String(gameId);
      writeStorage(GAME_STORAGE_KEY, this.selectedGame);
    },

    /** Loads the games of the selected season, or one "All games" entry when there is no breakdown. */
    refreshCurrentGames() {
      const season = this.seasonData;
      this.currentGames = season?.games?.length
        ? season.games
        : [
            {
              gameId: ALL_GAMES_ID,
              gameName: 'All games',
              players: season?.players ?? [],
              tournaments: season?.tournaments ?? [],
              funStats: season?.funStats ?? {},
            },
          ];
    },

    /** Falls back to the first game when the selected one does not exist in this season. */
    ensureValidGame() {
      const valid = this.games.some((game) => String(game.gameId) === String(this.selectedGame));
      this.selectedGame = valid ? String(this.selectedGame) : String(this.games[0]?.gameId ?? ALL_GAMES_ID);
      writeStorage(GAME_STORAGE_KEY, this.selectedGame);
    },
  },
});
