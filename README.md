# FG Dojo Leaderboard - S3 Ready

A static website showing game leaderboards for the Fighting Game Dojo community, ready to deploy to AWS S3.

## Features

✅ **Season-Based Leaderboards** - Organize tournaments into seasons  
✅ **Per-Game Leaderboards** - Switch between Street Fighter 6, Tekken 8, and Guilty Gear Strive  
✅ **Player Rankings** - Sorted by win rate, games won, tournaments attended  
✅ **Tournament History** - View past tournament winners and stats  
✅ **Fun Stats** - Most 1st places, highest win rates, most tournaments attended  
✅ **Auto-Refresh Button** - One-click data reload with cache busting  
✅ **No Server Required** - Pure static HTML + JSON (S3 compatible)  
✅ **Responsive Design** - Works on mobile and desktop  

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Process all seasons
node scripts/process_all_seasons.js

# Or process a specific season (e.g., season 0)
node scripts/fetch_tournaments.js 0
node scripts/process_leaderboard.js 0

# Serve locally
npm start
```

Visit `http://localhost:3000` to view the leaderboard.

The season dropdown **automatically detects** available seasons by checking the `seasons/` folder!

## Season Management

### Adding a New Season

1. Create a new season file in the `seasons/` directory:
```bash
# Create season-1.txt
echo "tournament/your-tournament/event/your-event" > seasons/season-1.txt
```

2. Add tournament slugs (one per line):
```
tournament/fighting-game-dojo-january-26/event/1v1-fgdojo-street-fighter-6-pc
tournament/fighting-game-dojo-january-26/event/1v1-fgdojo-tekken-8-ps5
tournament/fighting-game-dojo-january-26/event/1v1-fgdojo-guilty-gear-strive-pc
```

3. Process the season:
```bash
node fetch_tournaments.js 1
node process_leaderboard.js 1
```

### Processing All Seasons

```bash
# Fetch and process all seasons at once
node scripts/process_all_seasons.js
```

This will automatically detect all `season-X.txt` files and process them.

**The website dropdown automatically updates!** No manual configuration needed.

## Available npm Scripts

```bash
npm start       # Start local development server
npm run build   # Build for deployment (copies files to dist/)
npm run fetch   # Fetch season 0 (use with args for other seasons)
npm run process # Process season 0 (use with args for other seasons)
```

## Manual Season Processing

```bash
# Fetch tournament data for season 0
node scripts/fetch_tournaments.js 0

# Process into leaderboard
node scripts/process_leaderboard.js 0

# Repeat for other seasons
node scripts/fetch_tournaments.js 1
node scripts/process_leaderboard.js 1
```

## S3 Deployment

### Prerequisites

- AWS S3 bucket configured for static website hosting
- AWS credentials configured (access key + secret key)
- CloudFront distribution (optional but recommended)

### Manual Deployment

1. Generate fresh data for all seasons:
```bash
node process_all_seasons.js
npm run build
```

2. Upload to S3:
```bash
# Upload all leaderboard files
aws s3 sync dist/ s3://your-bucket-name \
  --exclude "*" \
  --include "index.html" \
  --include "leaderboard-season-*.json" \
  --include "fgdlogo.jpg"
```

3. Set cache headers:
```bash
# Short cache for JSON files (5 minutes)
aws s3 cp dist/ s3://your-bucket-name/ \
  --recursive \
  --exclude "*" \
  --include "leaderboard-season-*.json" \
  --cache-control "max-age=300"

# Longer cache for HTML (1 hour)
aws s3 cp dist/index.html s3://your-bucket-name/index.html \
  --cache-control "max-age=3600"
```

### Automatic Deployment (GitHub Actions)

1. Add secrets to your GitHub repo:
   - `STARTGG_KEY` - Your start.gg API token
   - `AWS_ACCESS_KEY_ID` - AWS credentials
   - `AWS_SECRET_ACCESS_KEY` - AWS credentials
   - `S3_BUCKET_NAME` - Your S3 bucket name
   - `CLOUDFRONT_DIST_ID` - (Optional) CloudFront distribution ID

2. The workflow in `.github/workflows/refresh-leaderboard.yml` will:
   - Run daily at 2 AM UTC (configurable)
   - Fetch latest tournament data
   - Process into leaderboard format
   - Upload to S3
   - Invalidate CloudFront cache
   - Auto-commit updated data to repo

## Data Refresh Strategy

### Browser-Side
- Click the **Refresh button** on the page to reload `leaderboard.json`
- Uses cache busting (`?v=timestamp`) to bypass browser cache
- No server-side refresh endpoint needed

### Server-Side (Recommended for S3)
- Set up GitHub Actions to run on schedule (daily)
- Or use AWS Lambda + CloudWatch Events
- Or manual refresh before re-uploading to S3

## Environment Variables

Create a `.env` file:

```
STARTGG_KEY=your_start_gg_api_key
```

Get your API key from: https://start.gg/admin/profile/api

## File Structure

```
fgdojoLeaderboard/
├── scripts/                        # All executable scripts
│   ├── fetch_tournaments.js        # Fetches data from start.gg
│   ├── process_leaderboard.js      # Processes into leaderboard format
│   ├── process_all_seasons.js      # Processes all available seasons
│   ├── build.js                    # Build script for deployment
│   └── server.js                   # Local development server
│
├── seasons/                        # Season configuration
│   ├── season-0.txt                # Tournament slugs for season 0
│   └── season-1.txt                # Tournament slugs for season 1
│
├── data/                           # Generated data (gitignored)
│   ├── output-season-0.json        # Raw tournament data
│   └── leaderboard-season-0.json   # Processed leaderboard
│
├── public/                         # Static website files
│   ├── index.html                  # Main website
│   └── fgdlogo.jpg                 # Logo
│
├── dist/                           # Built files for deployment
│   ├── index.html
│   ├── fgdlogo.jpg
│   └── leaderboard-season-*.json
│
├── package.json                    # Project configuration
├── .env                            # API key (not in git)
├── README.md                       # This file
└── STRUCTURE.md                    # Detailed structure documentation
```

See [STRUCTURE.md](STRUCTURE.md) for detailed folder explanations.

## How It Works

1. **Season Files** (`seasons/season-X.txt`)
   - Queries start.gg GraphQL API for each event
   - Fetches entrants, standings, and match data
   - Saves to `output-season-X.json`

3. **Data Process** (`process_leaderboard.js`)
   - Accepts season number as argument (e.g., `node process_leaderboard.js 0`)
   - Reads `output-season-X.json`
   - Calculates per-game stats, win rates, placements
   - Groups data by game (Street Fighter 6, Tekken 8, Guilty Gear Strive)
   - Generates fun stats (top players, win rates, etc.)
   - Saves to `leaderboard-season-X.json`

4. **Batch Processing** (`process_all_seasons.js`)
   - Automatically detects all season files
   - Runs fetch and process for each season
   - Useful for refreshing all seasons at once

5. **Display** (`index.html`)
   - Auto-detects available seasons by checking for `leaderboard-season-X.json` files
   -Add/Edit Tournament Slugs

1. Edit the appropriate season file in `seasons/` directory:
```bash
# Edit season 0
nano seasons/season-0.txt

# Add a new tournament slug
echo "tournament/your-new-event/event/your-game" >> seasons/season-0.txt
```

2. Re-process the season:
```bash
node fetch_tournaments.js 0
node process_leaderboard.js 0
```

### Create a New Season

```bash
# Create season-2.txt
cat > seasons/season-2.txt << 'EOF'
tournament/fighting-game-dojo-february-26/event/1v1-fgdojo-street-fighter-6-pc
tournament/fighting-game-dojo-february-26/event/1v1-fgdojo-tekken-8-ps5
EOF

# Process it
node fetch_tournaments.js 2
node process_leaderboard.js 2
```
   - Provides refresh button with cache busting
   - Remembers last selected season and game in localStorages, etc.)
   - Saves to `leaderboard.json`

3. **Display** (`index.html`)
   - Loads `leaderboard.json` on page load
   - Renders game selector dropdown
   - Shows per-game leaderboards and statistics
   - Provides refresh button with cache busting

## Customization

### Change Event Slugs

Edit the `EVENT_SLUGS` array in `fetch_tournaments.js` to include different tournaments or events.

### Adjust Cache Times

In S3 bucket properties or during upload:
- `leaderboard.json` - Default 5 minutes (`max-age=300`)
- `index.html` - Default 1 hour (`max-age=3600`)

### Schedule GitHub Actions

Edit the cron expression in `.github/workflows/refresh-leaderboard.yml`:
```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

## Troubleshooting

### "STARTGG_KEY not found"
Make sure `.env` file exists with your API token, or set environment variable before running.

### Data not updating
- Check GitHub Actions logs (if using automation)
- Manually run `npm run build` and re-upload to S3
- Check S3 cache headers

### Stale data in browser
- Click the **Refresh button** on the website
- Or hard refresh browser (Ctrl+F5 / Cmd+Shift+R)

## Performance Tips

- Enable **CloudFront** for global CDN distribution
- Set S3 bucket to **Block Public Access** and use CloudFront
- Enable **Gzip compression** for JSON/HTML files
- Use CloudFront cache invalidation after updates
- Monitor CloudFront costs for high-traffic scenarios

## License

ISC

## Author

IzLeStick - Fighting Game Dojo Community
