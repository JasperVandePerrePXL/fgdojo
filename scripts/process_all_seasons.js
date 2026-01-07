#!/usr/bin/env node
// Process all available seasons
// Usage: node process_all_seasons.js

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getAvailableSeasons() {
  const seasonsDir = path.join(__dirname, '..', 'seasons');
  try {
    const files = await fs.readdir(seasonsDir);
    const seasons = files
      .filter(f => f.match(/^season-(\d+)\.txt$/))
      .map(f => f.match(/^season-(\d+)\.txt$/)[1])
      .sort((a, b) => parseInt(a) - parseInt(b));
    return seasons;
  } catch (err) {
    console.error('Error reading seasons directory:', err.message);
    return [];
  }
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  const seasons = await getAvailableSeasons();
  
  if (seasons.length === 0) {
    console.error('No season files found in seasons/ directory');
    process.exit(1);
  }

  console.log(`\n🎮 Found ${seasons.length} season(s): ${seasons.join(', ')}\n`);

  for (const season of seasons) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing Season ${season}`);
    console.log('='.repeat(60));

    try {
      // Fetch tournament data
      console.log('\n1️⃣ Fetching tournament data...');
      await runCommand('node', ['scripts/fetch_tournaments.js', season]);

      // Process leaderboard
      console.log('\n2️⃣ Processing leaderboard...');
      await runCommand('node', ['scripts/process_leaderboard.js', season]);

      console.log(`\n✅ Season ${season} completed successfully!\n`);
    } catch (err) {
      console.error(`\n❌ Error processing season ${season}:`, err.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 All seasons processed!');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
