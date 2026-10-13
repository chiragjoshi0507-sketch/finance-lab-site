#!/usr/bin/env python3
"""Refresh the Daily Brief tile in data/content.json from the Substack RSS feed.

The newest post on https://financelabssei.substack.com becomes today's Daily Brief.
Everything else in content.json is left untouched. Standard library only.
"""
import html, json, re, sys, urllib.request
from pathlib import Path

FEED = "https://financelabssei.substack.com/feed"
CONTENT = Path(__file__).resolve().parent.parent / "data" / "content.json"


def tag(item, name):
    m = re.search(r"<%s[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</%s>" % (name, name), item, re.S)
    return html.unescape(m.group(1)).strip() if m else ""


def main():
    req = urllib.request.Request(FEED, headers={"User-Agent": "Mozilla/5.0 FinanceLabSite"})
    xml = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
    items = re.findall(r"<item>(.*?)</item>", xml, re.S)
    if not items:
        sys.exit("no items in feed - leaving content.json unchanged")
    it = items[0]
    img = re.search(r'<enclosure url="([^"]+)"', it)
    new = {
        "title": tag(it, "title"),
        "summary": tag(it, "description"),
        "url": tag(it, "link"),
        "image": img.group(1) if img else "",
    }
    if not (new["title"] and new["url"]):
        sys.exit("feed item missing title/url - leaving content.json unchanged")
    data = json.loads(CONTENT.read_text(encoding="utf-8"))
    brief = data["brief"]
    if all(brief.get(k) == v for k, v in new.items()):
        print("brief already current:", new["title"])
        return
    brief.update(new)
    brief.pop("placeholder", None)
    CONTENT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("brief updated:", new["title"])


if __name__ == "__main__":
    main()
