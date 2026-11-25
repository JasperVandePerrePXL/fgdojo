# Fighting Game Dojo leaderboard

A static leaderboard website for the Fighting Game Dojo tournaments. Results are fetched from the
[start.gg](https://start.gg) GraphQL API, turned into statistics by a small Node.js pipeline, shown by a
Vue 3 + Pinia interface bundled with Vite, and deployed to Amazon S3 by GitHub Actions.

- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Configuration files](#configuration-files)
- [Maintenance](#maintenance)
- [Counting rules](#counting-rules)
- [GitHub Actions](#github-actions)
- [Extending the project](#extending-the-project)
- [Code quality](#code-quality)
- [Tests](#tests)

## Quick start

```bash
cp .env.example .env     # then put your start.gg API key after STARTGG_KEY=
npm install
npm run check            # lint + formatting check + unit tests, no API key needed
npm run build            # fetch + process + build the site into dist/
npm start                # preview dist/ on http://localhost:3000
```

`npm run dev` starts the Vite development server instead (it shows the data currently in `public/data/leaderboards.json`).
Never commit `.env`: it contains your API key and is listed in `.gitignore`.

### npm scripts

| Script | What it does |
| --- | --- |
| `npm run fetch` | Downloads the configured events from start.gg into `data/events.json`. Needs `STARTGG_KEY`; without it the existing data is kept. |
| `npm run process` | Calculates all statistics from `data/events.json` and writes `public/data/leaderboards.json`. No API key needed. |
| `npm run build` | `fetch` + `process` + `vite build` → the complete site in `dist/`. |
| `npm run refresh` | `fetch` + `process` only (quick data refresh, no site build). |
| `npm run next-event` | Looks up the latest tournament via the hub link and adds it to `data/tournament_slugs.json` (see [Next-event automation](#next-event-automation)). |
| `npm run dev` | Vite development server with hot reload. |
| `npm start` | Serves the built `dist/` folder with `vite preview` on port 3000. Run `npm run build` first. |
| `npm test` | Runs the Node.js test suite. |
| `npm run lint` / `npm run lint:fix` | ESLint: reports (or fixes) code problems. See [Code quality](#code-quality). |
| `npm run format` / `npm run format:check` | Prettier: formats (or checks the formatting of) all code. |
| `npm run check` | `lint` + `format:check` + `test`; the same checks the Test workflow runs. |

## How it works

```
data/tournament_slugs.json ─┐
data/games.json ────────────┤
                            ▼
              src/pipeline/fetch_tournaments.js   ◄── start.gg API (src/startgg/)
                            │
                            ▼
                    data/events.json              raw events, grouped by season
                            │
                            ▼
              src/pipeline/process_leaderboard.js ◄── src/stats/ (the calculations)
                            │                         data/hidden_players.json
                            ▼
            public/data/leaderboards.json         the only file the website loads
                            │
                            ▼
              Vite + app/ (Vue 3 + Pinia)  →  dist/  →  Amazon S3
```

1. `data/tournament_slugs.json` lists seasons and tournaments; `data/games.json` maps each game to the start.gg event slugs it uses.
2. `fetch_tournaments.js` combines every tournament with every game of its season and downloads the matching events. Several event slug variants are tried in order until one exists.
3. Raw responses are stored in `data/events.json`. Responses are also cached in `.cache/startgg/`.
4. `process_leaderboard.js` calculates statistics per season and for all seasons combined and writes `public/data/leaderboards.json`.
   This includes `funStats`, the highlight top lists, for every season and for every game.
5. The Vue app loads that JSON file and shows rankings, highlights and the event history. The website does no statistics of its own: it only selects, sorts and displays what the pipeline produced.

Rules that both sides need (what a dojo is, the minimum games for a win rate, which highlight lists exist) live once in `shared/`.

The API endpoint is `https://api.start.gg/gql/alpha`. The queries live in `src/startgg/queries.js`.

### Safety rules of the data fetch

The site must never lose results because start.gg had a bad day. These rules live in
`src/pipeline/event_fetcher.js` and are tested in `tests/event_fetcher.test.js`:

- A finished event (older than 14 days) is served from the cache and never downloaded again; recent events are re-checked.
- Requests are throttled (about one per second) and retried with backoff on network errors, HTTP 429 and 5xx.
- After 3 failures in a row the API is treated as down and cached data is used.
- If a season comes back with fewer events than before, its previous data is kept.
- `npm run fetch` always exits successfully so a flaky API cannot block a deployment of the last known good data.

## Project structure

```
app/                         Vue 3 + Pinia website
  main.js                      entry point
  App.vue                      page layout; composes the components below
  components/                  one component per visible block of the page
    AppHeader, HeroSection, RankingControls, SummaryMetrics,
    PlayerRanking → PlayerRow, HighlightsPanel → HighlightList,
    EventHistory, AppFooter
  stores/leaderboard.js        Pinia store: loads the JSON, season/game selection, derived values
  utils/                       display helpers (format.js) and localStorage wrappers (storage.js)
  styles.css                   all styling (desktop and mobile)

shared/                      plain JavaScript used by both src/ and app/ (no Node.js or browser APIs)
  rules.js                     dojoKeyOf, MIN_GAMES_FOR_WIN_RATE
  highlights.js                registry of the highlight top lists (most wins, best win rate, ...)

src/                         Node.js code (ES modules)
  pipeline/                    the two steps run by npm scripts
    fetch_tournaments.js         start.gg → data/events.json (wires the real client and cache)
    event_fetcher.js             the fetch safety rules, with the client and cache passed in
    process_leaderboard.js       data/events.json → public/data/leaderboards.json
  stats/                       the calculations (pure functions, no file or network access)
    leaderboard.js               events → players, games, tournaments
    ranking.js                   win rate and the weighted ranking score
    fun_stats.js                 top-5 list per highlight in shared/highlights.js
    season_output.js             builds one season's object for leaderboards.json
    names.js                     player-name and player-ID helpers
    types.js                     JSDoc description of every data shape
  config/                      reads the hand-maintained files in data/
    tournaments.js               seasons, tournament slugs, games → event slugs
    hidden_players.js            hidden-player check
  startgg/                     everything that talks to start.gg
    client.js                    GraphQL client with retry and throttling, API key lookup
    cache.js                     on-disk response cache (createFileCache)
    queries.js                   the GraphQL documents
  storage/raw_events.js        reads/writes data/events.json
  next_event/                  automatic discovery of the newest tournament
    hub.js                       follows https://start.gg/RBHubFGDojo
    lookup.js                    API lookups (start date, name-search fallback)
    config_update.js             pure functions that edit tournament_slugs.json
    cli.js                       the script run by the workflow
  cli/refresh.js               `npm run refresh`
  lib/                         shared helpers: paths.js, dates.js (Brussels time), json.js, cli.js

data/                        configuration (edited by hand) and raw data (generated)
public/                      static files copied into the site; public/data/leaderboards.json is generated
tests/                       Node test suite
.github/workflows/           test, deploy, refresh-leaderboard, update-next-event
```

Generated files: `data/events.json`, `public/data/leaderboards.json`, `dist/` and `.cache/`.

## Configuration files

| File | Purpose |
| --- | --- |
| `data/tournament_slugs.json` | Seasons and tournaments (manual, plus automatic additions by the next-event script). Also holds `nextEventUrl` and `defaultGames`. |
| `data/games.json` | Game registry: game ID → display name and known start.gg event slug variants. |
| `data/hidden_players.json` | Players removed from every ranking and winner display. |
| `.env` | `STARTGG_KEY` for local runs (never committed). `STARTGG_API_KEY` is accepted as an alternative name. |

## Maintenance

### Add a season or tournament

Edit `data/tournament_slugs.json`:

```json
{
  "defaultGames": ["street-fighter-6", "tekken-8", "guilty-gear-strive"],
  "seasons": {
    "2": {
      "name": "Season 2",
      "tournaments": [
        { "name": "June '27 edition", "slug": "fighting-game-dojo-june-edition" }
      ]
    }
  }
}
```

- `defaultGames` is used by every tournament that has no `games` list of its own.
- `slug` is the start.gg tournament slug or the full tournament URL.
- Add `games` to a single tournament (or a season) only when its games differ from the defaults.
- Never guess a slug: confirm on start.gg that the tournament exists.
- Do not enter full event slugs (`/event/1v1-fgdojo-...`) here; they are built from `data/games.json`.

### Add a game

Add it to `data/games.json`:

```json
"new-game": {
  "name": "New Fighting Game",
  "eventSlugs": ["1v1-fgdojo-new-game-pc", "1v1-new-game-pc"]
}
```

Then add `new-game` to `defaultGames` or to a tournament's `games`. The fetch tries the event slugs in order until one returns data.
Game additions are always manual: the next-event script never changes game IDs.

### Hide players

Edit `data/hidden_players.json`:

```json
{ "displayNames": ["HM! | Biscuit"], "playerIds": [] }
```

`displayNames` must match the name shown on the site (case-insensitive); `playerIds` are stable start.gg player IDs. Hidden players are removed before any player, ranking, game or winner statistic is calculated.

### Next-event automation

`.github/workflows/update-next-event.yml` runs `npm run next-event` every Sunday and Monday (21:00 UTC), because tournaments are held on weekends. The script:

1. opens `https://start.gg/RBHubFGDojo`, which redirects to the page of the current Fighting Game Dojo tournament, and reads the tournament slug from the address;
2. looks up that tournament's start date through the API (needs `STARTGG_KEY`);
3. reports whether it is **already** in `data/tournament_slugs.json` (shown in the run log and on the run's summary page);
4. if it is new, adds it to the right season and sets `nextEventUrl` (the website's "Join the next event" button).

If the hub link cannot be read, it falls back to searching start.gg for the earliest upcoming tournament with "Fighting Game Dojo" in its name.
A new season starts every January: Season 0 is 2025, Season 1 is 2026, Season 2 is 2027, and so on, based on the tournament's start date in Brussels time.

When the file changed, the workflow commits it to `main` and starts the **Build and deploy** workflow itself (a push made with the default `GITHUB_TOKEN` does not trigger other workflows), so the website is updated right away.
If the script fails (hub unreadable, key missing, nothing found) the workflow run turns red.

## Counting rules

- A **dojo** is one tournament day. It is counted once even if it has several game events.
- A **player** is identified by the start.gg player ID and counts once per dojo, even when playing several games there.
- Attendance counts unique dojos, not game entries.
- Win rate is based on the recorded set scores (games won ÷ games played).
- The main ranking uses a weighted score (see `RANKING_WEIGHTS` in `src/stats/ranking.js`):
  - 40% win rate
  - 25% dojo attendance, normalized against the most-attended player in that ranking
  - 35% dojos won, normalized against the player with the most dojo wins in that ranking
- The weighting rewards consistency: a single high win rate or a lone title cannot dominate.
- The score is calculated separately for each game ranking and for the combined ranking.
- "Best win rate" lists need at least 10 games (`MIN_GAMES_FOR_WIN_RATE` in `shared/rules.js`).
- The "All-time highlights" panel shows the top 3 of each `funStats` list of the selected game, using the combined data of all seasons.

## GitHub Actions

| Workflow | Runs | What it does |
| --- | --- | --- |
| `test.yml` | Pull requests and pushes to `main` | Installs dependencies and runs `npm run lint`, `npm run format:check` and `npm test`. |
| `deploy.yml` | Pushes to `main` that change `app/`, `shared/`, `public/`, `src/`, `data/`, `tests/`, `index.html`, `vite.config.js`, package files or workflows; manual | Runs tests, builds the site (`npm run build`, with start.gg data) and syncs `dist/` to S3. HTML is uploaded with no-cache headers, other assets with a 5 minute cache. |
| `refresh-leaderboard.yml` | Sundays and Mondays 20:00 UTC; manual | Same build and deploy as above, so new results appear after the weekend. Falls back to cached data when start.gg is unavailable. |
| `update-next-event.yml` | Sundays and Mondays 21:00 UTC; manual | Next-event automation described above; deploys when it changed something. |

Workflows use concurrency groups so runs of the same kind do not overlap, and the start.gg cache is restored between runs.

### GitHub secrets

Set these under **Settings → Secrets and variables → Actions**:

- `STARTGG_KEY` – start.gg API key.
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` – credentials for the S3 deployment.

Never commit `.env`, API keys, AWS credentials or `.cache/`.

If a push by the next-event workflow is rejected, check whether branch protection on `main` blocks the `github-actions[bot]` user.

## Extending the project

Where new work usually goes:

- **A new highlight list** (for example "most games played") → add one entry to `shared/highlights.js` (`id`, `label`, `valueKey`, `suffix`, `score` and optionally `eligible`). The pipeline then writes it into `funStats` and the "All-time highlights" panel shows it; no other code changes are needed. If the value is a new player field, add that field first (next bullet) and to `toHighlightEntry` in `src/stats/fun_stats.js`.
- **A new statistic or ranking rule** → a pure function in `src/stats/`, called from `leaderboard.js` or `season_output.js`; document the new fields in `src/stats/types.js`, add tests in `tests/leaderboard.test.js` and describe the rule under [Counting rules](#counting-rules). A rule the website also needs goes in `shared/`.
- **A new block on the page** (for example a chart) → a new component in `app/components/`, added to `app/App.vue`. Shared state and derived values belong in `app/stores/leaderboard.js`; formatting helpers in `app/utils/`. Styling goes in `app/styles.css`.
- **Statistics over time** → today the website data holds each player's totals plus a list of placements (`{ tournament, placement }`) and each tournament's date; there is no per-tournament history of win rate or score yet. A chart of ups and downs would need the pipeline to also write such a history (a new function in `src/stats/` and a new field in `leaderboards.json`), which the Vue side can then read. Decide which values to track before building it.
- **A new start.gg query** → add it to `src/startgg/queries.js` and call it through `gql()` from `src/startgg/client.js` so throttling and retries apply. Logic that decides *when* to call the API (like `event_fetcher.js`) takes the request function and cache as parameters, so it can be tested with fakes.
- **A new data file** → add its path to `src/lib/paths.js` and read it through `src/lib/json.js`.

Conventions: ES modules, small pure functions with a short JSDoc comment, no network or file access inside `src/stats/` or `shared/`, and every pipeline script exports its `main()` and only runs when started directly (`isMainModule`).

### Design patterns in use

| Pattern | Where | Why |
| --- | --- | --- |
| Pipeline | `fetch` → `data/events.json` → `process` → `leaderboards.json` → website | Each step can be run and checked on its own; the website never talks to start.gg. |
| Registry | `shared/highlights.js`, `data/games.json` | Adding a highlight or a game is one new entry, not a code change in several places. |
| Dependency injection | `createEventFetcher({ requestEvent, cache })`, `createFileCache(dir)` | The fetch safety rules are tested with in-memory fakes, without network or disk. |
| Pure functions (functional core) | `src/stats/`, `shared/`, `src/next_event/config_update.js` | Calculations are easy to test; file and network access stays at the edges (`pipeline/`, `startgg/`, `storage/`). |
| Store | `app/stores/leaderboard.js` (Pinia) | One place for state and derived values; components only receive props and emit events. |

## Code quality

```bash
npm run lint          # ESLint: code problems
npm run lint:fix      # fix what ESLint can fix automatically
npm run format        # Prettier: format all code
npm run check         # lint + formatting check + tests (what CI runs)
```

- ESLint is configured in `eslint.config.js` (JavaScript and Vue rules). It also guards the architecture: `app/` may not import from `src/` or use Node.js modules, and `src/stats/` and `shared/` may not use Node.js modules, `fetch` or `process`.
- Prettier is configured in `.prettierrc.json` (single quotes, 110 characters per line). `data/`, `public/data/` and Markdown files are not formatted (see `.prettierignore`).
- `.gitattributes` keeps LF line endings on every platform, so Prettier and Git agree on Windows too.
- Run `npm run check` before committing; the Test workflow fails on lint errors or unformatted code.

## Tests

```bash
npm test
node --test tests/leaderboard.test.js                                 # one file
node --test --test-name-pattern="hidden player" tests/leaderboard.test.js   # one test
```

The suite covers the leaderboard calculations and ranking, hidden players, tournament/game configuration, raw event storage, the fetch safety rules (cache use, API-down detection, slug variants, keeping previous data), next-event discovery logic (slug extraction, season selection, no duplicates), Brussels-time dates, start.gg key selection and the frontend helper functions. The tests need no API key and no network access.
