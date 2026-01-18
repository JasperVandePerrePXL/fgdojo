# Seasons & Tournaments Implementation

## Overview

The leaderboard system has been refactored to support **seasons** and **tournament organization by month**. All tournament slugs are now organized hierarchically and the frontend supports switching between seasons.

## Architecture

### Current Structure

**SEASONS** object in `src/fetch_tournaments.js`:
```javascript
SEASONS = {
  0: {
    name: 'Season 0',
    tournaments: {
      'December 2025': [...slugs...],
      'November 2025': [...slugs...],
      'Anniversary (October 2025)': [...slugs...],
      // ... more months
    }
  },
  1: {
    name: 'Season 1',
    tournaments: {
      // Add tournaments as they happen
    }
  }
}
```

### Benefits

✅ **Organized by Month** - Each tournament clearly labeled with its month  
✅ **Easy to Extend** - Adding Season 1 or future tournaments is simple  
✅ **Per-Season Leaderboards** - Each season has its own stats and rankings  
✅ **Separate Data Files** - Flexible data management  
✅ **Frontend Season Selector** - Users can switch between seasons  

## Generated Files

### Output Files (Tournament Data)
- `output.json` - All seasons combined (for backwards compatibility)
- `output_season_0.json` - Season 0 raw tournament data (30 events)
- `output_season_1.json` - Season 1 raw tournament data (empty, ready for new tournaments)

### Leaderboard Files (Processed Stats)
- `leaderboard.json` - All seasons combined (for backwards compatibility)
- `leaderboard_season_0.json` - Season 0 leaderboard with player stats, games data, tournament history, and fun stats
- `leaderboard_season_1.json` - Season 1 leaderboard (generated automatically once tournaments are added)

## Current Season 0 Tournaments (by Month)

1. **December 2025** - Street Fighter 6 (PC), Tekken 8 (PS5), Guilty Gear Strive (PC)
2. **November 2025** - Street Fighter 6 (PC), Tekken 8 (PS5), Guilty Gear Strive (PC)
3. **Anniversary (October 2025)** - Street Fighter 6 (PC), Tekken 8 (PS5), Guilty Gear Strive (PC)
4. **Back To School (September 2025)** - Street Fighter 6 (PC), Tekken 8 (PS5), Guilty Gear Strive (PC)
5. **Summer Part 2 (August 2025)** - Street Fighter 6 (PC), Tekken 8 (PS5), Guilty Gear Strive (PC)
6. **Summer Edition (July 2025)** - Street Fighter 6 (PC), Tekken 8 (PS5), Guilty Gear Strive (PC)
7. **Fifth Round (June 2025)** - Street Fighter 6, Tekken 8, Guilty Gear Strive
8. **Fourth Round (May 2025)** - Street Fighter 6, Tekken 8, Guilty Gear Strive
9. **Third Round (April 2025)** - Street Fighter 6, Tekken 8
10. **Second Round (March 2025)** - Street Fighter 6, Tekken 8
11. **First Round (January 2025)** - Street Fighter 6, Tekken 8

**Total: 30 events, 11 monthly tournaments, 106 unique players**

## How to Add Season 1

### 1. Add Tournament Slugs
Edit `src/fetch_tournaments.js` and add tournaments to `SEASONS[1].tournaments`:

```javascript
1: {
  name: 'Season 1',
  tournaments: {
    'January 2026': [
      'tournament/fighting-game-dojo-january-26/event/1v1-fgdojo-street-fighter-6-pc',
      'tournament/fighting-game-dojo-january-26/event/1v1-fgdojo-tekken-8-ps5',
      'tournament/fighting-game-dojo-january-26/event/1v1-fgdojo-guilty-gear-strive-pc',
    ],
    // Add more months...
  },
}
```

### 2. Run Build
```bash
npm run build
```

This will:
- Fetch Season 1 tournament data → `output_season_1.json`
- Process Season 1 stats → `leaderboard_season_1.json`
- Update combined files → `leaderboard.json`, `output.json`

### 3. Frontend Automatically Shows
The season selector dropdown in the UI will automatically display Season 1 once the leaderboard files exist.

## Frontend Features

### Season Selector
- Dropdown at the top to switch between seasons
- Settings persisted to localStorage
- Loads corresponding leaderboard data on selection

### Game Selector
- Still available per season
- Choose between individual games or "All Games"
- Resets when changing seasons

### Data Display Per Season
- Player leaderboard (filtered by season and game)
- Tournament history (only tournaments from that season)
- Fun stats (top 5 for each category within the season)
- Games breakdown (separate stats per game)

## File Modifications Summary

### `src/fetch_tournaments.js`
- Replaced flat `EVENT_SLUGS` array with hierarchical `SEASONS` object
- Organized by season → tournament → slugs
- Now generates:
  - `output_season_X.json` for each season
  - `output.json` for all seasons combined

### `src/process_leaderboard.js`
- Added season-aware processing
- Generates:
  - `leaderboard_season_X.json` for each season
  - `leaderboard.json` for combined data
- Each leaderboard includes `seasonId` and `seasonName` metadata

### `public/index.html`
- Added season selector dropdown above game selector
- Season selection triggers loading of `leaderboard_season_X.json`
- Season preference saved to localStorage
- UI updates to show current season name

## Usage

### For Development
```bash
npm run fetch    # Fetches all season data
npm run process  # Processes into leaderboards
npm run build    # Does both above + creates dist/
npm start        # Serves on http://localhost:3000
```

### For S3 Deployment
Upload these files to S3:
- `public/index.html`
- `leaderboard.json` (or `leaderboard_season_0.json`, `leaderboard_season_1.json`, etc.)
- `output.json` (optional, for reference)

The frontend automatically loads the correct leaderboard based on user's season selection.

## Data Size

- **Season 0**: 30 events, 106 players
- **Season 1**: Ready for new tournaments (currently empty)
- **File sizes**: ~170 KB per season leaderboard

## Future Enhancements

Possible improvements:
- Add season start/end dates in metadata
- Display season progression/timeline
- Compare stats across seasons
- Archival/historical season data
- Season-specific achievements or milestones
