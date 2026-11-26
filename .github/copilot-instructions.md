# Fighting Game Dojo Project Guidelines

## Architecture

- This is an ES module Node.js application (`"type": "module"`) with a Vue 3/Pinia frontend bundled by Vite.
- The data pipeline is `src/pipeline/fetch_tournaments.js` → `data/events.json` → `src/pipeline/process_leaderboard.js` → `public/data/leaderboards.json` → Vite → `dist/`.
- Backend folders: `src/pipeline/` (scripts run by npm), `src/stats/` (pure statistics functions), `src/config/` (reads `data/*.json`), `src/startgg/` (client, cache, GraphQL queries), `src/storage/` (raw event file), `src/next_event/` (next-tournament discovery), `src/cli/` (`refresh`), `src/lib/` (paths, dates, JSON and CLI helpers).
- `shared/` holds plain JavaScript used by both `src/` and `app/`: counting rules (`rules.js`) and the highlight registry (`highlights.js`). The website computes no statistics itself; it displays `leaderboards.json`, including the pipeline's `funStats`.
- Frontend code lives in `app/`: `App.vue` only composes components from `app/components/`, `stores/leaderboard.js` holds state, `utils/` holds pure helpers and `styles.css` provides responsive desktop/mobile layouts. Three pages (Vite inputs): rankings (`index.html`), stats (`stats.html`, `app/stats/`) and player pages (`player.html?id=…`, `app/player/`, data from `src/stats/player_profiles.js` → `public/data/players.json`).
- `src/startgg/client.js` owns the GraphQL client with retry/backoff and throttling; `src/startgg/cache.js` owns the response cache. The fetch safety rules live in `src/pipeline/event_fetcher.js`, which receives the request function and cache as parameters (tested in `tests/event_fetcher.test.js`).
- `data/tournament_slugs.json` is the source of truth for seasons and tournament slugs (manual, plus automatic additions by `src/next_event/`). Enter only the tournament slug and game IDs there.
- `data/games.json` owns the game registry and known start.gg event-slug variants.
- `data/hidden_players.json` owns display names/player IDs excluded from public rankings and winner displays.
- `data/player_aliases.json` merges start.gg accounts of the same player (applied in `getPlayerId`, `src/stats/names.js`).
- The Next dojo card reads `public/data/next-dojo.json`, written only by `next-dojo.yml` (every 30 minutes, `npm run next-dojo`); dojo phases and times are in `shared/dojo_time.js`. Results are refreshed after the dojo by `deploy.yml` (Saturday, Sunday and Monday evening), not during it.
- `npm run seeding` (`src/cli/seeding.js`) makes a private seeding list on a TO's computer; never run it in a workflow, because the repository and its logs are public.
- `src/config/tournaments.js` normalizes tournament slugs/URLs and expands game IDs into full event candidates.

## Data and Secrets

- Never commit `.env`, API keys, or `.cache/` contents. Use `STARTGG_KEY` locally; `STARTGG_API_KEY` is also supported.
- Treat `data/events.json`, `public/data/leaderboards.json`, and `dist/` as generated or refreshed output. Preserve last-known-good data when the start.gg API is unavailable.
- Do not bypass the client’s request throttling, retry, cache, or graceful fallback behavior when changing data fetching.
- Automatic next-event discovery (`src/next_event/`, run by `update-next-event.yml` on Sundays and Mondays) follows the hub link `https://start.gg/RBHubFGDojo`, may update `nextEventUrl` and add a verified tournament, and must not discover or change game IDs; all game additions remain manual in `data/games.json`.

## Build and Test

- Install dependencies with `npm ci --no-audit --no-fund` (use `npm install` only to change dependencies, and commit `package-lock.json`).
- Run focused tests with `npm test`; run `npm run check` (ESLint + Prettier check + tests) before committing, as the Test workflow does. `npm run lint:fix` and `npm run format` fix most issues.
- Run `npm run dev` for the Vue/Vite development server.
- Run `npm run fetch` to refresh raw event data, `npm run process` to regenerate leaderboard data, and `npm run build` for the complete fetch/process/Vite build pipeline.
- Do not run API-dependent commands without a configured `STARTGG_KEY`. Prefer the existing unit tests for logic-only changes. Keep `src/stats/` free of file and network access.

## Conventions

- Follow existing Vue 3 Composition API and Pinia conventions in `app/`; keep Node.js data-processing code in `src/`. Use scoped or shared CSS intentionally and preserve mobile layouts.
- Preserve explicit error logging and last-known-good fallbacks; do not silently turn failed fetches into successful empty results.
- The leaderboard is ordered by Elo rating (`src/stats/elo.js`; ratings carry over between seasons, weighted by bracket size and win margin). Players need 2 dojos and 5 rated sets in that season/game to be ranked (`src/stats/ranking.js`). Game events without any played set are left out everywhere (`onlyFinishedEvents` in `src/stats/sets.js`). Keep the rules in README "Counting rules" in sync and add tests in `tests/elo.test.js` when changing them.
- A new highlight list is one entry in `shared/highlights.js`. `app/` must not import from `src/`; ESLint enforces this and keeps `src/stats/` and `shared/` free of Node.js APIs.
- When changing leaderboard calculations, update or add tests in `tests/leaderboard.test.js`. When changing manual season or game configuration, update or add tests in `tests/tournament_config.test.js`.
- Keep generated files and deployment behavior consistent with `.github/workflows/` and `README.md`.
