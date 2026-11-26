#!/usr/bin/env node
// Used by the dojo-day schedule of deploy.yml: is it the dojo day between 13:00 and 23:00 (Brussels)?
// Reads the live https://<site>/data/next-dojo.json (no API key, no install needed) and writes `refresh=true|false`
// to $GITHUB_OUTPUT. On any other day the deploy job is skipped, so the schedule costs a few seconds.
// Usage: node src/cli/results_refresh_gate.js https://fgdojo.stek.world
import fs from 'node:fs/promises';
import { isResultsRefreshTime } from '../../shared/dojo_time.js';
import { isMainModule } from '../lib/cli.js';

export async function main(siteUrl = process.argv[2]) {
  let refresh = false;
  try {
    const response = await fetch(new URL('/data/next-dojo.json', siteUrl), { cache: 'no-store' });
    if (response.ok) {
      const { nextDojo } = await response.json();
      refresh = isResultsRefreshTime(nextDojo, new Date());
      console.log(
        `Next dojo: ${nextDojo ? `${nextDojo.name} (${nextDojo.date})` : 'none'} → refresh: ${refresh}`,
      );
    } else {
      console.log(`next-dojo.json: HTTP ${response.status} → refresh: false`);
    }
  } catch (error) {
    console.log(`next-dojo.json could not be read (${error.message}) → refresh: false`);
  }
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `refresh=${refresh}\n`);
}

if (isMainModule(import.meta.url)) {
  main();
}
