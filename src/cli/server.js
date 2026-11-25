#!/usr/bin/env node
// Serves the built website (dist/) on http://localhost:3000.
// Usage: npm run build && npm start
// Data is NOT refreshed here; run `npm run build` again to pick up new results.
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { DIST_DIR } from '../lib/paths.js';

const PORT = Number(process.env.PORT) || 3000;

if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.error('❌ dist/ not found. Run "npm run build" first.');
  process.exit(1);
}

const app = express();
app.use(express.static(DIST_DIR));

app.listen(PORT, () => {
  console.log('\n🎮 Fighting Game Dojo Leaderboard');
  console.log(`📊 Serving dist/ at http://localhost:${PORT}\n`);
});
