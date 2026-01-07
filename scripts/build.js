#!/usr/bin/env node
// Build script: Copy source files to dist/ directory

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const DIST_DIR = path.join(rootDir, 'dist');
const PUBLIC_DIR = path.join(rootDir, 'public');
const DATA_DIR = path.join(rootDir, 'data');
const FILES_TO_COPY = [
  { src: path.join(PUBLIC_DIR, 'index.html'), dest: 'index.html' },
  { src: path.join(PUBLIC_DIR, 'fgdlogo.jpg'), dest: 'fgdlogo.jpg' },
];

async function build() {
  try {
    // Create dist directory if it doesn't exist
    await fs.mkdir(DIST_DIR, { recursive: true });
    console.log(`📁 Created dist directory\n`);

    // Copy public files
    for (const file of FILES_TO_COPY) {
      try {
        await fs.copyFile(file.src, path.join(DIST_DIR, file.dest));
        console.log(`✓ Copied ${file.dest}`);
      } catch (err) {
        console.warn(`⚠ Skipped ${file.dest} (not found)`);
      }
    }

    // Copy all season leaderboard files from data folder to dist/data/
    const dataDistDir = path.join(DIST_DIR, 'data');
    await fs.mkdir(dataDistDir, { recursive: true });
    
    const files = await fs.readdir(DATA_DIR);
    const seasonFiles = files.filter(f => f.match(/^leaderboard-season-\d+\.json$/));
    for (const file of seasonFiles) {
      const src = path.join(DATA_DIR, file);
      const dest = path.join(dataDistDir, file);
      try {
        await fs.copyFile(src, dest);
        console.log(`✓ Copied data/${file}`);
      } catch (err) {
        console.warn(`⚠ Skipped data/${file}`);
      }
    }

    console.log(`\n✅ Build complete! Files ready in dist/\n`);
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
