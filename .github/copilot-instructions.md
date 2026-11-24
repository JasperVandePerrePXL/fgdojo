# Fighting Game Dojo Project Guidelines

## Architecture

- This is an ES module Node.js application (`"type": "module"`) that builds a static leaderboard site.
- The data pipeline is `src/fetch_tournaments.js` → `data/events.json` → `src/process_leaderboard.js` → `public/data/leaderboards.json` → `src/build.js` → `dist/`.
- `src/startgg.js` owns the start.gg GraphQL client, retry/backoff behavior, and cache.
- `src/data_store.js` owns the consolidated raw event file and legacy JSON migration.
- `data/tournament_slugs.json` is the manual source of truth for seasons and tournament slugs. Enter only the tournament slug and game IDs there.
- `data/games.json` owns the game registry and known start.gg event-slug variants.
- `data/hidden_players.json` owns display names/player IDs excluded from public rankings and winner displays.
- `src/tournament_config.js` normalizes tournament slugs/URLs and expands game IDs into full event candidates.

## Data and Secrets

- Never commit `.env`, API keys, or `.cache/` contents. Use `STARTGG_KEY` locally; `STARTGG_API_KEY` is also supported.
- Treat `data/events.json`, `public/data/leaderboards.json`, and `dist/` as generated or refreshed output. Preserve last-known-good data when the start.gg API is unavailable.
- Do not bypass the client’s request throttling, retry, cache, or graceful fallback behavior when changing data fetching.
- Do not reintroduce automatic tournament discovery; all tournament additions must be maintained in `data/tournament_slugs.json`.

## Build and Test

- Install dependencies with `npm ci`.
- Run focused tests with `npm test`.
- Run `npm run fetch` to refresh raw event data, `npm run process` to regenerate leaderboard data, and `npm run build` for the complete fetch/process/static build pipeline.
- Do not run API-dependent commands without a configured `STARTGG_KEY`. Prefer the existing unit tests for logic-only changes.

## Conventions

- Follow the existing plain JavaScript style and use the standard Node.js APIs already used in `src/`.
- Preserve explicit error logging and last-known-good fallbacks; do not silently turn failed fetches into successful empty results.
- When changing leaderboard calculations, update or add tests in `tests/leaderboard.test.js`. When changing manual season or game configuration, update or add tests in `tests/tournament_config.test.js`.
- Keep generated files and deployment behavior consistent with `.github/workflows/` and `README.md`.
