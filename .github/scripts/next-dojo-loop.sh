#!/usr/bin/env bash
# Used by .github/workflows/next-dojo.yml: updates the Next dojo card ROUNDS times, INTERVAL seconds apart.
# Each round: one start.gg lookup (npm run next-dojo); next-dojo.json is uploaded only when it differs from
# the live file. A failed round only logs a warning; the card keeps its last data and the next round retries.
set -u
SITE="https://fgdojo.stek.world"
BUCKET="s3://fgdojo.stek.world"

for round in $(seq 1 "$ROUNDS"); do
  echo "::group::Round ${round}/${ROUNDS} ($(date -u +%H:%M) UTC)"
  if npm run --silent next-dojo; then
    if curl -fsS "${SITE}/data/next-dojo.json" -o live.json && cmp -s live.json public/data/next-dojo.json; then
      echo "No change."
    elif aws s3 cp public/data/next-dojo.json "${BUCKET}/data/next-dojo.json" \
      --cache-control "no-cache" --content-type "application/json"; then
      echo "Uploaded."
    else
      echo "::warning::Upload of next-dojo.json failed; retrying next round."
    fi
  else
    echo "::warning::start.gg lookup failed; the card keeps its last data."
  fi
  echo "::endgroup::"
  if [ "$round" -lt "$ROUNDS" ]; then sleep "$INTERVAL"; fi
done
