#!/usr/bin/env node
// Build script: Copy source files to dist/ directory

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DIST_DIR = path.join(__dirname, 'dist');
const FILES_TO_COPY = [
  'index.html',
  'leaderboard.json',
];

async function build() {
  try {
    // Create dist directory if it doesn't exist
    await fs.mkdir(DIST_DIR, { recursive: true });
    console.log(`📁 Created dist directory\n`);

    // Copy files
    for (const file of FILES_TO_COPY) {
      const src = path.join(__dirname, file);
      const dest = path.join(DIST_DIR, file);
      try {
        await fs.copyFile(src, dest);
        console.log(`✓ Copied ${file}`);
      } catch (err) {
        console.warn(`⚠ Skipped ${file} (not found)`);
      }
    }

    console.log(`\n✅ Build complete! Files ready in dist/\n`);
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
