#!/usr/bin/env node
// Build script: Copy source files to dist/ directory

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const DIST_DIR = path.join(rootDir, 'dist');
const PUBLIC_DIR = path.join(rootDir, 'public');

async function build() {
  try {
    // Clean dist and ensure it exists
    await fs.rm(DIST_DIR, { recursive: true, force: true });
    await fs.mkdir(DIST_DIR, { recursive: true });
    console.log('📁 Prepared dist directory\n');

    // Copy everything from public into dist (includes HTML, assets, and JSON outputs)
    await fs.cp(PUBLIC_DIR, DIST_DIR, { recursive: true });
    console.log('✓ Copied public/ to dist/');

    console.log(`\n✅ Build complete! Files ready in dist/\n`);
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
