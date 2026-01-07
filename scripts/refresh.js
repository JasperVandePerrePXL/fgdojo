#!/usr/bin/env node
// Quick refresh and serve for local testing
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Refreshing leaderboard data...\n');

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptName], { cwd: __dirname });
    
    child.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    child.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptName} failed`));
      }
    });
  });
}

async function main() {
  try {
    await runScript('fetch_tournaments.js');
    await runScript('process_leaderboard.js');
    console.log('\n✅ Data refresh complete!\n');
    console.log('📊 Run "npm start" to view the leaderboard');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
