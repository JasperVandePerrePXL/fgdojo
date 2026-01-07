# Season Management Guide

## Overview

This leaderboard system now supports multiple seasons. Each season has its own:
- Tournament slug list (`seasons/season-X.txt`)
- Raw tournament data (`output-season-X.json`)
- Processed leaderboard (`leaderboard-season-X.json`)

## Quick Commands

### Process All Seasons
```bash
node process_all_seasons.js
```
This automatically finds and processes all season files.

### Process a Single Season
```bash
# Fetch tournament data for season 0
node fetch_tournaments.js 0

# Process into leaderboard
node process_leaderboard.js 0
```

### Create a New Season
```bash
# 1. Create the season file
echo "tournament/your-tournament/event/your-event" > seasons/season-1.txt

# 2. Add more slugs (one per line)
# Edit seasons/season-1.txt and add your tournament slugs

# 3. Process the season
node fetch_tournaments.js 1
node process_leaderboard.js 1
```

## File Structure

```
seasons/
├── season-0.txt          # Season 0 tournament slugs
├── season-1.txt          # Season 1 tournament slugs
└── season-2.txt          # Season 2 tournament slugs

output-season-0.json      # Raw data for season 0
output-season-1.json      # Raw data for season 1

leaderboard-season-0.json # Processed leaderboard for season 0
leaderboard-season-1.json # Processed leaderboard for season 1
```

## Season File Format

Each line in a season file should contain one tournament event slug:

```
# This is a comment (lines starting with # are ignored)

# Street Fighter 6 tournaments
tournament/fighting-game-dojo-january-26/event/1v1-fgdojo-street-fighter-6-pc
tournament/fighting-game-dojo-february-26/event/1v1-fgdojo-street-fighter-6-pc

# Tekken 8 tournaments
tournament/fighting-game-dojo-january-26/event/1v1-fgdojo-tekken-8-ps5
tournament/fighting-game-dojo-february-26/event/1v1-fgdojo-tekken-8-ps5

# Guilty Gear Strive tournaments
tournament/fighting-game-dojo-january-26/event/1v1-fgdojo-guilty-gear-strive-pc
```

## Frontend Season Selector

The website automatically:
1. Detects available seasons by checking for `leaderboard-season-X.json` files
2. Shows a season dropdown in the UI
3. Remembers your last selected season using localStorage
4. Loads the selected season's leaderboard data

Users can switch between seasons without refreshing the page (except when changing seasons, which triggers a reload).

## Deployment

When deploying to S3 or any static host:

1. Process all seasons:
```bash
node process_all_seasons.js
```

2. Build for deployment:
```bash
npm run build
```

3. Upload the `dist/` directory:
```bash
aws s3 sync dist/ s3://your-bucket-name/
```

The build script automatically copies:
- `index.html`
- All `leaderboard-season-*.json` files
- Static assets (images, etc.)

## Tips

### Organizing Seasons

- **Season 0**: All tournaments from 2025
- **Season 1**: All tournaments from 2026
- Or organize by calendar quarters, events, etc.

### Keeping Season 0 Updated

If you want to continue adding to season 0 while starting season 1:

1. Add new slugs to `seasons/season-0.txt`
2. Re-run `node fetch_tournaments.js 0`
3. Re-run `node process_leaderboard.js 0`

### Bulk Operations

To refresh all seasons at once:
```bash
node process_all_seasons.js
```

This is useful when:
- Tournament data has been updated on start.gg
- You've fixed a bug in processing logic
- You want to ensure all seasons are current
