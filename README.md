# Finance Lab by SSEI — one-page site

Static site, no build step. Five scenes (Daily Brief + FinQuest · Watch the Money · Under the Lens · Quick Takes · About) — the same blocks re-arrange into each scene as the visitor scrolls / swipes / presses arrow keys.

Preview: `./serve.sh` then open http://localhost:8099 (must be served; opening index.html as a file will not load the data).

## Updating content (no code changes)
- `data/content.json` — Daily Brief article, videos, research, Instagram posts, social links, About text. Entries with `"placeholder": true` are stand-ins: replace them and delete that flag.
  - Video thumbnail: set `youtubeId` (thumbnail is fetched from YouTube) or `image`.
  - Brief / research / post thumbnail: set `image` (path or URL).
- `data/quiz.json` — daily quiz. A question with `"date": "YYYY-MM-DD"` (IST) shows that day; otherwise undated questions rotate by day of year. `answer` is the 0-based index of the correct option.

## Files
`index.html` · `css/style.css` · `js/app.js` · `data/*.json`

## Daily Brief auto-refresh
`scripts/refresh_brief.py` copies the newest post from https://financelabssei.substack.com/feed into the Daily Brief tile. `scripts/refresh_and_push.sh` runs it and pushes only if something changed. A cron entry on the SSEI box runs it every 3 hours (`crontab -l` to see / remove it). Everything else in content.json (videos, research, posts, quiz) is edited by hand.

## Hosting
GitHub Pages from `main` — https://chiragjoshi0507-sketch.github.io/finance-lab-site/ . Every push to `main` republishes within a minute or two. Pages needs a public repo on the free plan.
