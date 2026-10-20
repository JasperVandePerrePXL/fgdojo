# Fighting Game Dojo – leaderboard site

Static site (plain HTML/CSS/JS) deployed to S3. Data comes from the start.gg API at build time.

```bash
cp .env.example .env     # add your start.gg key locally (never commit .env)
npm ci
npm run build            # fetch -> process -> dist/
npx http-server dist     # or: npm start
```

## How it works
- `src/startgg.js` – API client: retry/backoff, on-disk cache (`.cache/startgg`), tournament discovery.
- `src/fetch_tournaments.js` – fetches events (slugs in `src/seasons.js` + auto-discovered ones). If the API fails it keeps the last known good `output_season_*.json`.
- `src/process_leaderboard.js` – builds `public/leaderboard_season_*.json`.
- `src/build.js` – copies `public/` to `dist/` and writes `seasons.json`.
- `.github/workflows/deploy.yml` – deploys on relevant pushes, weekly (Sunday 20:00 UTC), or manually.

## Secrets (GitHub → Settings → Secrets → Actions)
`STARTGG_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
