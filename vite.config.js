import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    // Three pages: the leaderboard (/), the stats page (/stats.html) and the player page (/player.html).
    rollupOptions: {
      input: { main: 'index.html', stats: 'stats.html', player: 'player.html' },
    },
  },
});
