import { defineStore } from 'pinia';

const seasonKey = 'fgdojo.selectedSeason';
const gameKey = 'fgdojo.selectedGame';

function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

export const useLeaderboardStore = defineStore('leaderboard', {
  state: () => ({
    bundle: null,
    seasons: [],
    selectedSeason: readStorage(seasonKey),
    selectedGame: readStorage(gameKey),
    loading: true,
    error: null,
  }),
  getters: {
    seasonData(state) {
      return state.bundle?.seasons?.[state.selectedSeason] ?? null;
    },
    games() {
      return this.seasonData?.games?.length
        ? this.seasonData.games
        : [{ gameId: 'all', gameName: 'All games', players: this.seasonData?.players ?? [], tournaments: this.seasonData?.tournaments ?? [] }];
    },
    gameData(state) {
      return this.games.find((game) => String(game.gameId) === String(state.selectedGame)) ?? this.games[0] ?? null;
    },
    rankedPlayers() {
      return [...(this.gameData?.players ?? [])].sort((a, b) =>
        b.winRateNum - a.winRateNum ||
        b.gamesWon - a.gamesWon ||
        b.tournamentsAttended - a.tournamentsAttended ||
        b.firstPlaces - a.firstPlaces
      );
    },
    dojoCount() {
      return new Set((this.gameData?.tournaments ?? []).map((tournament) =>
        tournament.dojoId || `${tournament.date || ''}|${tournament.name || ''}`
      )).size;
    },
    totalGames() {
      return this.rankedPlayers.reduce((total, player) => total + player.gamesWon + player.gamesLost, 0);
    },
  },
  actions: {
    async load() {
      this.loading = true;
      this.error = null;
      try {
        const response = await fetch(`/data/leaderboards.json?v=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.bundle = await response.json();
        this.seasons = Object.keys(this.bundle.seasons || {}).map(Number).sort((a, b) => a - b);

        const latest = this.seasons.at(-1);
        this.selectedSeason = this.seasons.includes(Number(this.selectedSeason))
          ? String(this.selectedSeason)
          : String(latest);
        writeStorage(seasonKey, this.selectedSeason);
        this.ensureValidGame();
      } catch (error) {
        this.error = 'Leaderboard data is temporarily unavailable.';
      } finally {
        this.loading = false;
      }
    },
    setSeason(seasonId) {
      this.selectedSeason = String(seasonId);
      writeStorage(seasonKey, this.selectedSeason);
      this.ensureValidGame();
    },
    setGame(gameId) {
      this.selectedGame = String(gameId);
      writeStorage(gameKey, this.selectedGame);
    },
    ensureValidGame() {
      const gameList = this.games;
      const valid = gameList.some((game) => String(game.gameId) === String(this.selectedGame));
      this.selectedGame = valid ? String(this.selectedGame) : String(gameList[0]?.gameId ?? 'all');
      writeStorage(gameKey, this.selectedGame);
    },
  },
});
