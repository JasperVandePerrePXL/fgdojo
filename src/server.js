#!/usr/bin/env node
// Simple server that refreshes data and serves the leaderboard page
import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const app = express();
const PORT = 3000;

// Serve static files from public directory
app.use(express.static(path.join(rootDir, 'public')));

// Run Node scripts sequentially
function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`Running ${scriptName}...`);
    const child = spawn('node', [scriptName], { cwd: path.join(rootDir, 'src') });
    
    child.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    child.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${scriptName} completed\n`);
        resolve();
      } else {
        reject(new Error(`${scriptName} failed with code ${code}`));
      }
    });
  });
}

// Endpoint to refresh data
app.get('/refresh', async (req, res) => {
  try {
    await runScript('fetch_tournaments.js');
    await runScript('process_leaderboard.js');
    res.json({ success: true, message: 'Leaderboard refreshed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Main page - refresh data before first load
app.get('/', async (req, res) => {
  try {
    console.log('\n=== Refreshing leaderboard data ===\n');
    await runScript('fetch_tournaments.js');
    await runScript('process_leaderboard.js');
    console.log('=== Data refresh complete ===\n');
    res.sendFile(path.join(rootDir, 'public', 'index.html'));
  } catch (error) {
    res.status(500).send(`Error refreshing data: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`\n🎮 Fighting Game Dojo Leaderboard Server`);
  console.log(`📊 Server running at http://localhost:${PORT}`);
  console.log(`\nRefreshing data on page load...`);
  console.log(`To manually refresh: http://localhost:${PORT}/refresh\n`);
});
