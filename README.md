# Fighting Game Dojo leaderboard

A static leaderboard for Fighting Game Dojo events. The interface is built with Vue 3 and Pinia and bundled with Vite. Data is fetched from the start.gg GraphQL API and the generated site is deployed to Amazon S3.

## Local setup

```bash
cp .env.example .env
npm install
npm run dev
npm test
npm run build
npm start
```

Set `STARTGG_KEY` in `.env` for data refreshes. `npm run dev` starts the Vue/Vite development server. `npm start` serves the built site through Express; run `npm run build` first to generate the static data and `dist/` output.

## How the project works

1. `data/tournament_slugs.json` defines seasons and tournaments manually.
2. `data/games.json` maps game IDs to the start.gg event slug variants used by the site.
3. `src/fetch_tournaments.js` combines each tournament slug with the configured game slugs and fetches them from start.gg.
4. `src/startgg.js` sends GraphQL requests, retries temporary/rate-limit failures, and caches responses in `.cache/startgg/`.
5. Raw event responses are consolidated in `data/events.json`.
6. `src/process_leaderboard.js` calculates player and game statistics and writes `public/data/leaderboards.json`.
7. Vite bundles the Vue 3 interface from `app/` and writes the static result to `dist/`.

The API endpoint is `https://api.start.gg/gql/alpha`. The project requests event entrants, standings, set scores, tournament information, and video-game information using GraphQL.

## Maintenance

### Add a season or tournament

Edit `data/tournament_slugs.json`.

```json
{
  "defaultGames": [
    "street-fighter-6",
    "tekken-8",
    "guilty-gear-strive"
  ],
  "seasons": {
    "2": {
      "name": "Season 2",
      "tournaments": [
        {
          "name": "Fighting Game Dojo - June edition",
          "slug": "fighting-game-dojo-june-edition"
        }
      ]
    }
  }
}
```

- `defaultGames` is used by tournaments that do not specify `games`.
- `slug` may be the start.gg tournament slug or full tournament URL.
- Add `games` to an individual tournament only when its games differ from the season defaults.
- Never guess a slug. Confirm the tournament exists on start.gg before adding it.
- Do not add full event slugs such as `/event/1v1-fgdojo-...` to this file.

### Add a game

Add the game to `data/games.json`:

```json
{
  "new-game": {
    "name": "New Fighting Game",
    "eventSlugs": [
      "1v1-fgdojo-new-game-pc",
      "1v1-new-game-pc"
    ]
  }
}
```

Then add `new-game` to `defaultGames` or to a tournament's `games` list. Known event slug variants can be included in the same game entry. The fetch process tries them in order until it receives event data.

### Hide players

Edit `data/hidden_players.json`:

```json
{
  "displayNames": [
    "HM! | Biscuit"
  ],
  "playerIds": []
}
```

Use `displayNames` for the exact name shown on the site. `playerIds` may be used for the stable start.gg player ID instead. Hidden players are removed before player, ranking, game, and winner statistics are generated.

### Update the next-event link and tournaments

After a refresh or deployment workflow succeeds, `update-next-event.yml` runs `src/next_event.js`. The script queries start.gg for the earliest upcoming Fighting Game Dojo tournament and updates:

- `nextEventUrl` in `data/tournament_slugs.json`, used by the website button.
- The next tournament entry in the matching season, with the base tournament slug.

Season IDs follow calendar years: Season 1 starts with 2026, Season 2 with 2027, and so on. The script creates a new season only when it finds a verified upcoming tournament for that year. It does not add or update game IDs; `defaultGames` and tournament `games` overrides remain manual.

The workflow can also be started manually from GitHub Actions.

### Refresh result data

```bash
npm run fetch
npm run process
npm run build
```

- `npm run fetch` refreshes raw events in `data/events.json`.
- `npm run process` rebuilds `public/data/leaderboards.json`.
- `npm run build` runs fetch, processing, and static build steps.

A completed result older than 14 days is cached permanently. Recent or unfinished events are rechecked. API failures, missing events, and partial seasons fall back to cached/raw last-known-good data instead of replacing it with empty results.

## Counting rules

- A **dojo** is counted once per tournament, even if that dojo has multiple game events.
- A **player** is counted once by start.gg player ID, even if the player plays multiple games at the same dojo.
- Player attendance counts one dojo visit per unique dojo, not one event or game entry per visit.
- Win percentage is based on recorded set scores.
- The main leaderboard uses a weighted score to balance consistency and attendance:
  - 40% win rate
  - 25% dojo attendance, normalized against the most-attended player in the selected ranking
  - 35% dojos won, normalized against the player with the most dojo wins in the selected ranking
- This balance makes winning meaningful while preventing a player with a single high-rate or title-only result from dominating.
- The weighted score is calculated separately for each game ranking and for the all-games/combined ranking.
- Highest win rate highlights require at least 10 games.

## Project structure

- `src/startgg.js`: start.gg GraphQL client, caching, and retry logic.
- `src/tournament_config.js`: tournament slug/URL handling and game expansion.
- `src/fetch_tournaments.js`: manual event fetching and last-known-good fallback.
- `src/data_store.js`: raw event storage and legacy file migration.
- `src/process_leaderboard.js`: player, game, season, and combined statistics.
- `src/seasons.js`: season export derived from `tournament_slugs.json`.
- `app/main.js`: Vue and Pinia application entry point.
- `app/App.vue`: page layout and leaderboard interface.
- `app/stores/leaderboard.js`: Pinia state, selection persistence, and leaderboard derived values.
- `app/components/`: reusable Vue interface components.
- `app/styles.css`: desktop and mobile responsive styling.
- `public/data/leaderboards.json`: generated leaderboard JSON served by the Vue interface.
- `tests/`: Node test suite.

## GitHub Actions workflows

### `test.yml`

Runs on pull requests and pushes to `main`. It installs dependencies and runs `npm test`, preventing untested configuration or leaderboard changes from being merged/deployed.

### `deploy.yml`

Runs on pushes to `main` that change project source, public site files, configuration, package files, or workflows. It also supports manual runs. The workflow builds the site with start.gg data and deploys `dist/` to S3.

### `refresh-leaderboard.yml`

Runs every Sunday and Monday at 20:00 UTC and supports manual runs. Sunday refreshes immediately after Saturday events. Monday provides a second check after data or weekend workflows may have been delayed. The workflow rebuilds and deploys, while preserving cached/previous data if start.gg is unavailable.

### `update-next-event.yml`

Runs after a successful refresh or deployment workflow, and supports manual runs. It discovers the next verified Fighting Game Dojo tournament, updates `nextEventUrl`, and adds only the tournament slug/name to the appropriate season. It does not discover or change game definitions.

These workflows use GitHub Actions concurrency controls and restore the start.gg cache between runs. A manual run does not require a new commit.

## GitHub secrets

Configure these repository secrets under **Settings → Secrets and variables → Actions**:

- `STARTGG_KEY`: start.gg API key used to refresh tournament data.
- `AWS_ACCESS_KEY_ID`: AWS credential for the S3 deployment.
- `AWS_SECRET_ACCESS_KEY`: AWS secret credential for the S3 deployment.

Never commit `.env`, API keys, AWS credentials, or `.cache/startgg/`.

## Tests

```bash
npm test
```

The suite covers leaderboard calculations, manual tournament/game configuration, hidden-player filtering, raw event storage, legacy migration, and start.gg key selection.
