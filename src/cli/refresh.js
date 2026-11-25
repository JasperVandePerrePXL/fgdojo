#!/usr/bin/env node
// Quick local refresh: fetch the events from start.gg, then rebuild leaderboards.json.
// Usage: npm run refresh   (does not build the website; use `npm run build` for that)
import { main as fetchTournaments } from '../pipeline/fetch_tournaments.js';
import { main as processLeaderboard } from '../pipeline/process_leaderboard.js';

console.log('🔄 Refreshing leaderboard data...\n');

try {
  await fetchTournaments();
  await processLeaderboard();
  console.log('\n✅ Data refresh complete!\n');
  console.log('📊 Run "npm run build" and then "npm start" to view the leaderboard');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
