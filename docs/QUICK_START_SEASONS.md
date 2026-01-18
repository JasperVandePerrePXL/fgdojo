# Quick Reference: Adding New Season 1 Tournaments

## Step-by-Step Guide to Add Season 1

### 1. Edit `src/fetch_tournaments.js`

Find the `SEASONS` object and add tournaments to Season 1:

```javascript
1: {
  name: 'Season 1',
  tournaments: {
    'January 2026': [
      'tournament/fighting-game-dojo-january-26/event/1v1-fgdojo-street-fighter-6-pc',
      'tournament/fighting-game-dojo-january-26/event/1v1-fgdojo-tekken-8-ps5',
      'tournament/fighting-game-dojo-january-26/event/1v1-fgdojo-guilty-gear-strive-pc',
    ],
    'February 2026': [
      // Add more tournaments...
    ],
  },
}
```

### 2. Run Build

```bash
npm run build
```

This automatically:
- Fetches Season 1 tournament data
- Generates `output_season_1.json`
- Processes into `leaderboard_season_1.json`
- Updates combined files

### 3. Deploy

For S3 deployment, upload the new leaderboard files:
```bash
aws s3 cp leaderboard_season_1.json s3://your-bucket/
aws s3 cp output_season_1.json s3://your-bucket/
```

The frontend will automatically show the Season 1 selector!

## Tournament Structure (Season 0 Example)

```
SEASONS = {
  0: {
    name: 'Season 0',
    tournaments: {
      'December 2025': [3 events],      // SF6, T8, GGS
      'November 2025': [3 events],
      'Anniversary (October 2025)': [3 events],
      'Back To School (September 2025)': [3 events],
      'Summer Part 2 (August 2025)': [3 events],
      'Summer Edition (July 2025)': [3 events],
      'Fifth Round (June 2025)': [3 events],
      'Fourth Round (May 2025)': [3 events],
      'Third Round (April 2025)': [2 events],  // SF6, T8 only
      'Second Round (March 2025)': [2 events],
      'First Round (January 2025)': [2 events],
    }
  }
}
```

Each tournament name is a monthly event with 2-3 game variants.

## File Locations

| File | Location | Purpose |
|------|----------|---------|
| Event slugs | `src/fetch_tournaments.js` | Define which tournaments to fetch |
| Fetch logic | `src/fetch_tournaments.js` | Iterates SEASONS → tournaments |
| Processing | `src/process_leaderboard.js` | Generates player stats per season |
| UI/Frontend | `public/index.html` | Season selector dropdown |
| Documentation | `docs/SEASONS.md` | Full implementation details |

## Key Commands

```bash
# Fetch new tournament data for all seasons
npm run fetch

# Process tournament data into leaderboards
npm run process

# Fetch + process + build for deployment
npm run build

# Start local server with UI
npm start

# Quick refresh (development)
npm run refresh
```

## Frontend Features

✅ Season selector at top of page  
✅ Game selector (filtered per season)  
✅ Per-season player leaderboards  
✅ Per-season tournament history  
✅ Per-season fun stats  
✅ LocalStorage persistence  

## What Happens When You Add Season 1

1. **Fetch**: Queries start.gg API for Season 1 tournaments
2. **Output**: Creates `output_season_1.json` with raw tournament data
3. **Process**: Generates `leaderboard_season_1.json` with stats
4. **Frontend**: Automatically shows Season 1 in dropdown
5. **UI**: Users can switch between Season 0 and Season 1 instantly

## Troubleshooting

**Q: Season 1 doesn't appear in dropdown?**  
A: Make sure `leaderboard_season_1.json` exists in root directory

**Q: Data looks wrong for Season 1?**  
A: Check that tournament slugs in `src/fetch_tournaments.js` are correct

**Q: Want to reset/rebuild a season?**  
A: Delete the corresponding `output_season_X.json` and `leaderboard_season_X.json`, then run `npm run build`

---

**Created**: January 2026  
**Last Updated**: January 18, 2026
