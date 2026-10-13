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
