# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Static leaderboard site for Fighting Game Dojo tournaments: start.gg GraphQL API → Node.js pipeline → one JSON file → Vue 3 + Pinia app built by Vite → deployed to S3 by GitHub Actions. README.md is detailed and authoritative for maintenance procedures (adding seasons/games, hiding players, counting rules, design patterns); `.github/copilot-instructions.md` holds the same project rules in short form.

## Commands

```bash
npm ci --no-audit --no-fund       # npm install only when changing dependencies; commit package-lock.json
npm run check      # lint + prettier check + tests — what CI runs; run before committing
npm run lint:fix   # ESLint autofix;  npm run format  # Prettier write
npm test                                   # node --test tests/**/*.test.js — no API key or network needed
node --test tests/leaderboard.test.js      # a single test file
node --test --test-name-pattern="winners" tests/leaderboard.test.js   # a single test
npm run dev        # Vite dev server; shows whatever is in public/data/leaderboards.json
npm run process    # data/events.json → public/data/leaderboards.json (no API key)
npm run fetch      # start.gg → data/events.json (needs STARTGG_KEY in .env; keeps existing data without it)
npm run refresh    # fetch + process
npm run build      # fetch + process + vite build → dist/
npm start          # vite preview of dist/ on :3000
npm run next-event # discover newest tournament via hub link, add to data/tournament_slugs.json
npm run next-dojo  # next dojo from start.gg → public/data/next-dojo.json (card; gitignored)
npm run seeding    # fetch, then private seeding list (live sign-ups sorted by Elo) → seeding/*.csv (gitignored)
```

Don't run API-dependent commands (`fetch`, `build`, `refresh`, `next-event`, `next-dojo`, `seeding`) without a configured `STARTGG_KEY` (`STARTGG_API_KEY` also accepted). For logic-only changes use the unit tests and `npm run process`; `npx vite build` builds the site without fetching. After changing the output shape, run `npm run process` and commit the regenerated `public/data/leaderboards.json`.

## Architecture

```
data/tournament_slugs.json + data/games.json
  → src/pipeline/fetch_tournaments.js (event_fetcher.js + src/startgg/) → data/events.json (raw, grouped by season)
  → src/pipeline/process_leaderboard.js (src/stats/, data/hidden_players.json) → public/data/leaderboards.json
  → Vite + app/ → dist/
```

- **Three code areas**: `src/` (Node pipeline), `app/` (browser), `shared/` (plain JS imported by both: `rules.js` with `dojoKeyOf`/`MIN_GAMES_FOR_WIN_RATE`, `highlights.js` registry). ESLint enforces the boundaries: `app/` cannot import `src/` or Node built-ins; `src/stats/` and `shared/` cannot use Node built-ins, `fetch` or `process`.
- **Website computes no statistics.** It selects/sorts/displays `leaderboards.json`. Highlight lists come from the pipeline's `funStats` (per season, per game, and in `combined`), defined by `shared/highlights.js` — adding a highlight is one registry entry; `HighlightsPanel.vue` and the process log iterate it.
- **Config expansion**: `tournament_slugs.json` lists seasons/tournaments (slug or URL) plus `defaultGames`; `games.json` maps game IDs to ordered event-slug variants. `src/config/tournaments.js` crosses tournaments with games into candidates; the fetch tries variants in order. Never put full event slugs in `tournament_slugs.json`.
- **Fetch safety (must be preserved)**: `src/pipeline/event_fetcher.js` (`createEventFetcher({ requestEvent, cache, now })`, `mergeSeasonEvents`) holds the rules — events older than 14 days served from cache forever, API treated as down after 3 consecutive failures, a season with fewer events keeps previous data. `src/startgg/client.js` does throttling (~1 req/s) and retry/backoff on network/429/5xx; `createFileCache()` in `cache.js` stores `.cache/startgg/`. `npm run fetch` always exits 0. Don't turn failed fetches into successful empty results. New queries go in `src/startgg/queries.js` through `gql()`.
- **Stats** (`src/stats/`): `leaderboard.js` builds players/games/tournaments; `elo.js` computes Elo ratings over all sets in date order (start 1500, K 32 / 64 for first 10 sets, × bracket-size and win-margin factors), carried over between seasons and snapshotted at each season's end; `ranking.js` adds `rating` and `ranked` (2+ dojos and 5+ rated sets in that season/game) — the leaderboard sorts ranked players by rating. Rules are documented in README "Counting rules"; change constants together with `tests/elo.test.js`; `fun_stats.js` builds `funStats` from the registry; `season_output.js` assembles each season object; `types.js` documents every data shape in JSDoc — update it when adding fields. Hidden players are removed before any statistic.
- **Counting rules**: only played game events count (`onlyFinishedEvents` drops events without any set result, e.g. upcoming dojos, at the start of `process`); a "dojo" is one tournament day (counted once across game events); a player is keyed by start.gg player ID and counts once per dojo; win rate = games won ÷ games played from set scores.
- **Next-event automation** (`src/next_event/`): follows `https://start.gg/RBHubFGDojo` to get the current slug, looks up its start date, falls back to name search. Season = Brussels-time year − 2025. May add a tournament and set `nextEventUrl`; must never add or change game IDs. `config_update.js` is pure and tested.
- **Frontend** (`app/`): `index.html` at repo root loads `app/main.js`. `App.vue` only composes components; all state and derived values (ranking order, hero numbers, `allTimeFunStats`) live in the Pinia store `app/stores/leaderboard.js`. Components take props and emit events. All CSS in `app/styles.css` (keep mobile layouts working). Long lists are paged with `paginate` + `PagerNav.vue`: ranking 10/page, event history 6/page newest first, tables 10/page, player dojo results 5/page.
- **Stats page** (`/stats.html`, "Stats" button in the leaderboard's top bar, second Vite input in `vite.config.js`): `src/stats/site_stats.js` → `public/data/stats.json` → `app/stats/StatsPage.vue` + `app/stores/stats.js`. Charts are hand-made SVG in `app/components/charts/` (no chart library); series colors are `--series-1..5` in `styles.css`, validated for CVD on the dark panel — keep game colors in first-appearance order. A page-wide period filter (`app/utils/ranges.js`, `selectedRange` in the store) filters dojos client-side; rivalries stay all-time. Tables use `PaginatedTable.vue` (10 rows/page).
- **Player pages** (`/player.html?id=…&game=…`, third Vite input; names in the ranking and opponents link there): `src/stats/player_profiles.js` (+ `historyByGame` from `computeRatings`) → `public/data/players.json` → `app/player/PlayerPage.vue` + `app/stores/player.js`. Per game: Elo history, head-to-head (top 5 shown), dojo results (5 per page). Hidden players get no page.
- **Next dojo card / live updates**: `next-dojo.yml` (every 30 min) runs `npm run next-dojo` (`src/pipeline/next_dojo.js`: hub link → one start.gg call → `toNextDojo` in `src/stats/next_dojo.js`) and uploads `public/data/next-dojo.json` only when changed; it is the only writer of that file (gitignored; deploy excludes it). `shared/dojo_time.js`: `dojoPhase` (upcoming / live from `SIGNUPS_CLOSE` 13:58 / over). Results are not refreshed during a dojo; they come with the Sat/Sun/Mon deploy schedule.
- **Shareable selection**: the leaderboard store reads `?season=&game=` before localStorage and writes them with `history.replaceState` on change (`app/utils/url.js`).
- **Merged accounts**: `data/player_aliases.json` (`playerId` + `otherIds`) → `src/config/player_aliases.js`; `getPlayerId` (names.js) returns the main ID (same type as the input), so every statistic merges them. Duplicate IDs throw.
- **Seeding** (`npm run seeding`, `src/cli/seeding.js` + pure `src/stats/seeding.js`): always the next dojo (`lookupNextDojo`, same as the card), else it says there is none; local only, never in a workflow (public repo → public logs). Writes `seeding/` (gitignored).
- **Paths**: all file paths come from `src/lib/paths.js`; read JSON through `src/lib/json.js`. Dates use Brussels time (`src/lib/dates.js`).

## Conventions

- ES modules. Pipeline scripts export `main()` and run only when executed directly: `if (isMainModule(import.meta.url)) main();` (`src/lib/cli.js`).
- Small pure functions with a short JSDoc comment; I/O stays at the edges (`pipeline/`, `startgg/`, `storage/`). Logic that needs I/O takes it as injected parameters so tests can use fakes.
- Prettier formats code (single quotes, width 110); `data/`, `public/data/` and `*.md` are excluded. LF line endings via `.gitattributes`.
- Tests: `node:test` + `node:assert/strict`. Leaderboard/ranking → `tests/leaderboard.test.js`; season/game config → `tests/tournament_config.test.js`; fetch rules → `tests/event_fetcher.test.js`. `tests/leaderboard.test.js` relies on the real `data/hidden_players.json` containing "HM! | Biscuit".
- Generated files: `data/events.json`, `public/data/leaderboards.json`, `stats.json`, `players.json` (committed as last-known-good data), `dist/`, `.cache/` (ignored). Never commit `.env` or `.cache/`.
- Keep README.md (counting rules, structure, patterns) and `.github/workflows/` consistent with behavior changes.

## CI/CD

- `test.yml`: lint, format check and tests on PRs and pushes to `main`.
- `deploy.yml`: on push to `main` (path-filtered, includes `app/`, `shared/`, `index.html`), Sat/Sun/Mon 20:00 UTC (results after the dojo) or manual — test, `npm run build`, `aws s3 sync dist` (HTML no-store, `data/` no-cache so browsers revalidate, assets 5 min).
- `update-next-event.yml` (Sun/Mon 21:00 UTC).
- `next-dojo.yml` (every 30 min): next dojo card, upload only when changed. The latter commits to `main` and dispatches the deploy workflow itself, since `GITHUB_TOKEN` pushes don't trigger workflows.
- CI uses Node 22; the start.gg cache is restored between runs via `actions/cache`.
- Actions are pinned to commit SHAs (`# vX.Y.Z` comment); Dependabot updates them. CI installs with `npm ci`.
