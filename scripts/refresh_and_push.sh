#!/bin/sh
# Pull the newest Substack post into the Daily Brief tile; publish only if it changed.
cd "$(dirname "$0")/.." || exit 1
python3 scripts/refresh_brief.py || exit 1
git diff --quiet data/content.json && exit 0
git add data/content.json
git commit -q -m "Daily Brief: refresh from Substack

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push -q origin main
