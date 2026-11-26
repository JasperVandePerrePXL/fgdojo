# Fighting Game Dojo leaderboard

A static leaderboard website for the Fighting Game Dojo tournaments. Results are fetched from the
[start.gg](https://start.gg) GraphQL API, turned into statistics by a small Node.js pipeline, shown by a
Vue 3 + Pinia interface bundled with Vite, and deployed to Amazon S3 by GitHub Actions.

- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Stats page](#stats-page)
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
| `npm run next-dojo` | Looks up the next dojo on start.gg and writes `public/data/next-dojo.json` for the card (see [Live updates](#live-updates)). Needs `STARTGG_KEY`. |
| `npm run seeding` | Private seeding list for the next dojo: live sign-ups per game sorted by Elo, printed and saved to `seeding/` (see [Seeding (private)](#seeding-private)). Needs `STARTGG_KEY`. |
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
            public/data/leaderboards.json         loaded by the leaderboard (/)
            public/data/stats.json                loaded by the stats page (/stats.html)
            public/data/players.json              loaded by the player pages (/player.html?id=…)
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

## Stats page

`/stats.html` on the website shows statistics over every tournament of every season.
It is reached through the **Stats** button in the top bar of the leaderboard (the stats page's own top bar has a
**Rankings** button back). It is marked `noindex` for search engines and is not protected.

A **Period** row at the top picks what the page shows: *All time*, each calendar year, and each half year
(H1 = January–June, H2 = July–December). Only periods with at least one dojo appear, so new years show up by
themselves. The period applies to the totals, the three dojo charts, the game share donut and the season table;
the rivalries are always all-time.

| Block | What it shows |
| --- | --- |
| Totals | Dojos held, different players (each counted once), sets played, games played in the period. |
| Players per dojo | Line chart of unique players at each dojo, oldest first. |
| Entrants per game per dojo | Stacked bars: players per game at each dojo, one color per game. |
| New vs returning players | Stacked bars: players at their first dojo ever vs players seen before ("new" always means first dojo ever, also when a period is selected). |
| Entrants per game | Donut with each game's share of the game entries in the period (games without entries are left out). |
| Season comparison | Per season that has dojos in the period: dojos, unique players, average players per dojo, game entries, sets and games (numbers for the whole season). |
| Biggest rivalries | One tab per game with its 5 most played 1v1 matchups and their set record (`RIVALRY_COUNT`); fewer when a game has fewer matchups. |

Every chart has a hover tooltip and a "Show data" table; all tables show 10 rows per page (`PAGE_SIZE` in
`app/utils/pagination.js`) with previous/next buttons. The periods are built in `app/utils/ranges.js`. Rules: hidden players are left out everywhere; sets with a
disqualification (negative score) are not counted; a set with equal scores is decided by start.gg's `winnerId`.
Each game keeps the same color everywhere (order of first appearance; colors in `--series-1..5` in `app/styles.css`,
validated for color-blind readers on the dark panel). A sixth game would get a neutral gray: add a color first.

The data is built by `buildSiteStats` in `src/stats/site_stats.js` during `npm run process` and written to
`public/data/stats.json` (shape: `SiteStats` in `src/stats/types.js`).

## Player pages

Every player name in the ranking links to `/player.html?id=<start.gg player ID>&game=<game ID>`. The page shows,
one game at a time (tabs when the player entered several games):

- the current rating, number of dojos and sets won–lost in that game;
- **Rating over time**: the Elo rating in that game after every dojo where the player played a rated set, across
  all seasons (the same rating as the ranking; see [Counting rules](#counting-rules));
- **Head-to-head**: rated sets won and lost against the 5 most played opponents (`TOP_COUNT` in
  `HeadToHeadList.vue`; `players.json` holds every opponent); opponent names link to their own page;
- **Dojo results**: placement and bracket size at every dojo entered, newest first, 5 per page.

Switching games updates the address bar, so the link can be shared. Hidden players have no page and are left out
of every head-to-head record. The data is built by `buildPlayerProfiles` in `src/stats/player_profiles.js` (rating
history from `computeRatings` in `elo.js`) and written to `public/data/players.json` (shape: `PlayerProfiles` in
`src/stats/types.js`).

## Rankings page extras

- **Paging**: the ranking shows 10 players per page (rank numbers stay the real position) and the event history
  6 dojo events per page, newest first. Both go back to page 1 when another season or game is chosen. Page sizes:
  `RANKING_PAGE_SIZE` in `PlayerRanking.vue`, `HISTORY_PAGE_SIZE` in `EventHistory.vue`; the previous/next buttons
  are `PagerNav.vue`, shared with every paged table.

- **Next dojo card** (see [Live updates](#live-updates)): above the leaderboard, from `public/data/next-dojo.json`.
  - Before the dojo, and on the dojo day until sign-ups close at 13:58: "Next dojo" with the date, sign-ups per
    game and a "Sign up on start.gg" button.
  - From 13:58 on the dojo day: "Live now" with a link to each game's bracket on start.gg.
  - From the day after: hidden, until start.gg has a new dojo (the card then shows it within about 30 minutes).
  The times live in `shared/dojo_time.js` (`SIGNUPS_CLOSE`, `dojoPhase`). start.gg stores the dojo's start as
  midnight, so only the date is shown.
- **Shareable links**: changing the season or game puts them in the address bar (`/?season=1&game=43868`);
  opening such a link shows that selection. Without parameters the remembered (localStorage) or latest selection
  is used; invalid values fall back the same way.

## Live updates

The site stays static (no server, no API key in the browser). The **Next dojo card** is kept close to live by
`next-dojo.yml`: every 30 minutes it runs `npm run next-dojo` (one start.gg call) and uploads
`public/data/next-dojo.json` to S3 only when it changed (new dojo, a sign-up count, or the dojo day passed).

`npm run next-dojo` (`src/pipeline/next_dojo.js`) follows the hub link `https://start.gg/RBHubFGDojo` (or searches
"Fighting Game Dojo" by name when the hub cannot be read), asks start.gg for that tournament's date and sign-ups
per game, and writes `{ "nextDojo": … }` (`toNextDojo` in `src/stats/next_dojo.js`; null once the dojo day has
passed). The file is only written by that workflow: the deploy never uploads or deletes `data/next-dojo.json`, and
the file is not committed (`.gitignore`). Run `npm run next-dojo` locally to see the card in `npm run dev`.

**Results** are not live: they appear after the dojo, with the scheduled refresh on Saturday, Sunday and Monday
evening (see [GitHub Actions](#github-actions)). Results only count for a dojo that is listed in
`data/tournament_slugs.json`; the next-event workflow adds new dojos on Sundays and Mondays.

GitHub may delay scheduled runs by 5-15 minutes at busy times, and disables schedules in a repository without
activity for 60 days (re-enable them under Actions).

## Project structure

```
app/                         Vue 3 + Pinia website
  main.js                      entry point of the leaderboard (index.html)
  App.vue                      page layout; composes the components below
  stats/                       the stats page (stats.html): main.js + StatsPage.vue
  player/                      the player page (player.html): main.js + PlayerPage.vue
  components/                  one component per visible block of the page
    AppHeader, HeroSection, RankingControls, SummaryMetrics,
    UpcomingDojo, PlayerRanking → PlayerRow, HighlightsPanel → HighlightList,
    EventHistory, HeadToHeadList (player page), PaginatedTable, PagerNav, AppFooter
    charts/                      SVG charts: LineChart, StackedBarChart, DonutChart, ChartFrame (title, legend, table)
  stores/leaderboard.js        Pinia store: loads the JSON, season/game selection, derived values
  stores/stats.js              Pinia store of the stats page: loads stats.json, shapes the chart data
  stores/player.js             Pinia store of the player page: loads players.json, player and game from the URL
  utils/                       display helpers (format.js), chart helpers (chart.js), localStorage wrappers (storage.js),
                               query-string and player-link helpers (url.js)
  styles.css                   all styling (desktop and mobile)

shared/                      plain JavaScript used by both src/ and app/ (no Node.js or browser APIs)
  rules.js                     dojoKeyOf, MIN_GAMES_FOR_WIN_RATE
  dojo_time.js                 dojo phases in Brussels time: upcoming / live (from 13:58) / over
  highlights.js                registry of the highlight top lists (most wins, best win rate, ...)

src/                         Node.js code (ES modules)
  pipeline/                    the two steps run by npm scripts
    fetch_tournaments.js         start.gg → data/events.json (wires the real client and cache)
    event_fetcher.js             the fetch safety rules, with the client and cache passed in
    process_leaderboard.js       data/events.json → public/data/leaderboards.json
  stats/                       the calculations (pure functions, no file or network access)
    leaderboard.js               events → players, games, tournaments
    elo.js                       Elo skill rating over all sets, snapshotted per season
    ranking.js                   win rate, rating lookup and who is ranked
    sets.js                      reads one set's result (shared by Elo and the stats page)
    fun_stats.js                 top-5 list per highlight in shared/highlights.js
    season_output.js             builds one season's object for leaderboards.json
    site_stats.js                everything for stats.json (stats page)
    player_profiles.js           everything for players.json (player pages)
    next_dojo.js                 the next dojo for the rankings page card (from a start.gg tournament)
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
.github/workflows/           test, deploy, update-next-event
```

Generated files: `data/events.json`, `public/data/leaderboards.json`, `public/data/stats.json`, `public/data/players.json`, `public/data/next-dojo.json` (not committed), `dist/` and `.cache/`.

## Configuration files

| File | Purpose |
| --- | --- |
| `data/tournament_slugs.json` | Seasons and tournaments (manual, plus automatic additions by the next-event script). Also holds `nextEventUrl` and `defaultGames`. |
| `data/games.json` | Game registry: game ID → display name and known start.gg event slug variants. |
| `data/hidden_players.json` | Players removed from every ranking and winner display. |
| `data/player_aliases.json` | start.gg accounts that belong to the same player; merged everywhere. |
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

### Merge two accounts of the same player

When one person signed up with two start.gg accounts, their results, rating and player page are split. Edit
`data/player_aliases.json`:

```json
{ "players": [{ "playerId": "1287124", "otherIds": ["2353012"], "note": "LikeHere / LykeHere" }] }
```

`playerId` is the main account; every ID in `otherIds` counts as that player everywhere (ranking, Elo, highlights,
stats page, player pages, seeding). The name from the most recent dojo is shown. A player ID listed twice stops
`npm run process` with an error, so a typo cannot merge the wrong people. Find IDs in `data/events.json`
(`participants[].player.id`) or in a player page link (`player.html?id=…`). `getPlayerId` in `src/stats/names.js`
applies the merge (`src/config/player_aliases.js`).

### Seeding (private)

`npm run seeding` makes a seeding list for the next dojo on your own computer; nothing is published or committed.

1. It runs `npm run fetch` first, so the ratings include the latest results (needs `STARTGG_KEY` in `.env`).
2. It always takes the next dojo, looked up on start.gg the same way as the "Next dojo" card
   (`lookupNextDojo`). When the last dojo has been played and start.gg has no new one yet, it says so and stops.
3. It downloads the live sign-ups of every game and sorts them by the current Elo rating in that game
   (ties by name). Players without a rating (no rated set in that game yet, or hidden players) come last in
   sign-up order: seed them by hand.
4. It prints the lists and saves `seeding/<tournament>.csv` (Game, Seed, Player, Rating, start.gg player ID).
   `seeding/` is in `.gitignore`.

The sorting is `buildSeeding` in `src/stats/seeding.js` (tested in `tests/seeding.test.js`). Don't run it in a
GitHub workflow: the repository is public, so workflow logs and summaries are public too.

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
- Only **played** game events count: an event without a single set result (an upcoming dojo with only registrations,
  or a bracket that never ran) is left out of every statistic, the leaderboard and the stats page until it has
  results (`onlyFinishedEvents` in `src/stats/sets.js`). It appears by itself after the next data refresh.
- A **player** is identified by the start.gg player ID and counts once per dojo, even when playing several games there.
- Attendance counts unique dojos, not game entries.
- Win rate is based on the recorded set scores (games won ÷ games played).
- The ranking is ordered by **Elo skill rating** (`src/stats/elo.js`), highest first; ties go to win rate, attendance and dojo wins.
  - Every player starts at **1500**. Every 1v1 set, in date order, moves both players' ratings: beating a higher-rated
    player gains more than beating a lower-rated one.
  - Per set the change is `K × bracket factor × margin factor × (result − expected result)`:
    - **K** = 64 for a player's first 10 sets (newcomers reach their level quickly), then 32;
    - **bracket factor** = log2(entrants of that game at that dojo) / 4, between 0.5 and 1.5
      (4 players → 0.5, 8 → 0.75, 16 → 1, 32 → 1.25), so bigger brackets count more;
    - **margin factor**: clean wins count a little more (2-0 and 3-1 → 1.1, 3-0 → 1.2; 2-1, 3-2 and sets without a
      reported score → 1).
  - Ratings **carry over between seasons**; a season's ranking shows each player's rating at the end of that season.
    The all-time ranking uses the same rules and shows the current rating.
  - Each game has its own rating; the "All games" ranking uses one rating over all games.
  - Sets against hidden players and disqualifications (negative score) do not count.
- The season drop-down has an **All seasons** entry: the leaderboard over every dojo of every season (the `combined`
  entry of `leaderboards.json`), with each player's current rating. It is listed first; the site opens on the latest
  season (or the last choice, remembered in the browser).
- To be **ranked**, a player needs at least **2 dojos** (`MIN_DOJOS_FOR_RANKING`) and at least **5 rated sets**
  (`MIN_RATED_SETS_FOR_RANKING`) in that season (or over all seasons) and game: a rating from only a few sets is still
  mostly the start rating of 1500. Others still count in every other statistic.
- The constants live in `src/stats/elo.js` and `src/stats/ranking.js`; change them there and update this section
  and `tests/elo.test.js`.
- "Best win rate" lists need at least 10 games (`MIN_GAMES_FOR_WIN_RATE` in `shared/rules.js`).
- The "All-time highlights" panel shows the top 3 of each `funStats` list of the selected game, using the combined data of all seasons.

## GitHub Actions

| Workflow | Runs | What it does |
| --- | --- | --- |
| `test.yml` | Pull requests and pushes to `main` | Installs dependencies and runs `npm run lint`, `npm run format:check` and `npm test`. |
| `deploy.yml` | Saturdays, Sundays and Mondays 20:00 UTC (results after the dojo); pushes to `main` that change `app/`, `shared/`, `public/`, `src/`, `data/`, `tests/`, `index.html`, `vite.config.js`, package files or workflows; manual | Runs tests, builds the site (`npm run build`, with start.gg data) and syncs `dist/` to S3. HTML is uploaded with no-cache headers, `data/*.json` with `no-cache` (browsers revalidate with the ETag and get a cheap 304 when nothing changed), other assets with a 5 minute cache. The scheduled run makes new results appear after the dojo and falls back to cached data when start.gg is unavailable. |
| `update-next-event.yml` | Sundays and Mondays 21:00 UTC; manual | Next-event automation described above; deploys when it changed something. |
| `next-dojo.yml` | Every 30 minutes; manual | Updates the Next dojo card (see [Live updates](#live-updates)). |

Workflows use concurrency groups so runs of the same kind do not overlap, and the start.gg cache is restored between runs.
Dependencies are installed with `npm ci`, so `package-lock.json` must be committed in sync with `package.json` (run `npm install` after changing dependencies).
Third-party actions are pinned to a full commit SHA (with the version in a comment); Dependabot (`.github/dependabot.yml`) opens a PR when a new version is released.

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
- **A new chart on the stats page** → add the numbers to `buildSiteStats` (with a test in `tests/site_stats.test.js` and the field in `SiteStats` in `types.js`), shape them in a getter of `app/stores/stats.js`, and place a `ChartFrame` with a `LineChart`, `StackedBarChart` or `DonutChart` in `app/stats/StatsPage.vue`.
- **A new block on the page** (for example a chart) → a new component in `app/components/`, added to `app/App.vue`. Shared state and derived values belong in `app/stores/leaderboard.js`; formatting helpers in `app/utils/`. Styling goes in `app/styles.css`.
- **Statistics over time** → the player pages already chart the Elo rating per dojo (`historyByGame` from `computeRatings`). Another value over time (win rate, placement) follows the same route: record it per dojo in `src/stats/player_profiles.js`, document it in `PlayerGame` in `types.js`, test it in `tests/player_profiles.test.js` and chart it in `app/player/PlayerPage.vue`.
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
