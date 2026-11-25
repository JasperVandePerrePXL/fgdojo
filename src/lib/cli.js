// Helpers for scripts that can be run from the command line (and imported by tests).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * True when the calling module was started directly (`node src/x.js`) and not imported.
 * Usage: `if (isMainModule(import.meta.url)) main();`
 */
export function isMainModule(importMetaUrl) {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(importMetaUrl);
}

/**
 * Loads `.env` into `process.env` when the optional `dotenv` package is installed.
 * In GitHub Actions the secrets are passed as real environment variables instead.
 */
export async function loadEnv() {
  try {
    (await import('dotenv')).config();
  } catch {
    // dotenv is optional: variables can also come from the shell.
  }
}
