# FG Dojo Leaderboard - S3 Ready

A static website showing game leaderboards for the Fighting Game Dojo community, ready to deploy to AWS S3.

## Features

✅ **Per-Game Leaderboards** - Switch between Street Fighter 6 and Tekken 8  
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

# Refresh data
npm run build

# Serve locally
npm start
```

Visit `http://localhost:3000` to view the leaderboard.

## Available npm Scripts

```bash
npm start       # Start local development server
npm run build   # Fetch data & process into leaderboard
npm run refresh # Quick refresh of data only
npm run fetch   # Fetch tournament data from start.gg
npm run process # Process data into leaderboard.json
```

## S3 Deployment

### Prerequisites

- AWS S3 bucket configured for static website hosting
- AWS credentials configured (access key + secret key)
- CloudFront distribution (optional but recommended)

### Manual Deployment

1. Generate fresh data:
```bash
npm run build
```

2. Upload to S3:
```bash
aws s3 sync . s3://your-bucket-name \
  --include "index.html" \
  --include "leaderboard.json" \
  --exclude "*"
```

3. Set cache headers:
```bash
aws s3 cp leaderboard.json s3://your-bucket-name/leaderboard.json \
  --cache-control "max-age=300"

aws s3 cp index.html s3://your-bucket-name/index.html \
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
├── index.html                 # Main website
├── leaderboard.json          # Generated leaderboard data
├── fetch_tournaments.js       # Fetches data from start.gg
├── process_leaderboard.js    # Processes into leaderboard format
├── server.js                 # Local development server
├── refresh.js                # Quick refresh helper
├── package.json
├── .env                      # API key (not in git)
├── .github/
│   └── workflows/
│       └── refresh-leaderboard.yml  # GitHub Actions automation
└── S3_DEPLOYMENT.md          # Detailed deployment guide
```

## How It Works

1. **Data Fetch** (`fetch_tournaments.js`)
   - Queries start.gg GraphQL API for FG Dojo events
   - Fetches entrants, standings, and match data
   - Saves to `output.json`

2. **Data Process** (`process_leaderboard.js`)
   - Reads `output.json`
   - Calculates per-game stats, win rates, placements
   - Groups data by game (Street Fighter 6, Tekken 8)
   - Generates fun stats (top players, win rates, etc.)
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
