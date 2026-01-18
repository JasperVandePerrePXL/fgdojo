````markdown
# S3 Deployment Guide

This website is now ready to be deployed as a static site on AWS S3.

## Files Included

- `public/index.html` - Main leaderboard page with auto-refresh capability
- `leaderboard.json` - Generated leaderboard data (must be regenerated regularly)
- `src/fetch_tournaments.js` - Fetches raw data from start.gg API
- `src/process_leaderboard.js` - Processes raw data into leaderboard format

## Deployment Steps

### 1. Build Static Assets

Run the data generation scripts to create `leaderboard.json`:

```bash
npm run build
```

This generates `leaderboard.json` which is served alongside `index.html`.

### 2. Deploy to S3

Upload these files to your S3 bucket:
- `public/index.html`
- `leaderboard.json`

```bash
aws s3 cp public/index.html s3://your-bucket-name/
aws s3 cp leaderboard.json s3://your-bucket-name/
```

### 3. Configure S3 Bucket

1. Enable **Static website hosting** in S3 bucket settings
2. Set **Index document** to `index.html`
3. Set **Error document** to `index.html` (for routing)
4. Enable **Public access** or use CloudFront for CDN

### 4. Enable Cache Control Headers

In S3 bucket properties, set:
- `leaderboard.json` - Cache control: `max-age=300` (5 minutes)
- `index.html` - Cache control: `max-age=3600` (1 hour)

## Automated Data Refresh

### Option A: GitHub Actions (Recommended)

Create `.github/workflows/refresh-leaderboard.yml`:

```yaml
name: Refresh Leaderboard

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Fetch tournament data
        env:
          STARTGG_KEY: ${{ secrets.STARTGG_KEY }}
        run: node src/fetch_tournaments.js
      
      - name: Process leaderboard
        run: node src/process_leaderboard.js
      
      - name: Upload to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws s3 cp leaderboard.json s3://your-bucket-name/leaderboard.json
          aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/leaderboard.json"
```

### Option B: AWS Lambda + CloudWatch Events

Set up a Lambda function to run the scripts on a schedule.

### Option C: Local Cron Job

Run locally on a machine with credentials:

```bash
0 2 * * * cd /path/to/fgdojoLeaderboard && npm run build && aws s3 cp leaderboard.json s3://your-bucket-name/
```

## Environment Variables

Set `STARTGG_KEY` in your CI/CD environment with your start.gg API token.

## Frontend Features

- **Automatic refresh button** - Click to reload data with cache busting
- **Game selector** - Switch between Street Fighter 6, Tekken 8, and per-game leaderboards
- **Responsive design** - Works on mobile and desktop
- **No server required** - Pure static HTML + JSON

## Cache Busting

The frontend automatically adds a timestamp to JSON requests to bypass browser cache:
```javascript
fetch('leaderboard.json?v=' + new Date().getTime())
```

This ensures users always see the latest data after clicking refresh.

````
