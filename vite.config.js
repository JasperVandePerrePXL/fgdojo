import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    // Two pages: the leaderboard (/) and the stats page (/stats.html).
    rollupOptions: {
      input: { main: 'index.html', stats: 'stats.html' },
    },
  },
});
