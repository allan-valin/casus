#!/usr/bin/env python3
"""Fetch a Wikibooks book (CC BY-SA 4.0) for Learn: its main page's links in their order (the book's own table of
contents), then each linked subpage's rendered HTML, one request a second. Writes vendor/wikibooks/<Book>/pages.json
= [{title, html}]. Usage: fetch_wikibooks.py Russian [more books…]"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = "https://en.wikibooks.org/w/api.php"
UA = {"User-Agent": "Casus/1.0 (https://allan-valin.github.io/casus/; language-learning site, open source)"}


def get(params):
    q = urllib.parse.urlencode({**params, "format": "json", "formatversion": 2})
    with urllib.request.urlopen(urllib.request.Request(f"{API}?{q}", headers=UA), timeout=60) as r:
        return json.load(r)


def parsed(title):
    return get({"action": "parse", "page": title, "prop": "text", "disableeditsection": 1, "redirects": 1})["parse"]["text"]


def main(book):
    out = ROOT / "vendor" / "wikibooks" / book
    out.mkdir(parents=True, exist_ok=True)
    main_html = parsed(book)
    order = []
    for href in re.findall(r'href="/wiki/([^"#?]+)"', main_html):
        t = urllib.parse.unquote(href).replace("_", " ")
        if t.startswith(book.replace("_", " ") + "/") and t not in order:
            order.append(t)
    pages = []
    for t in order:
        time.sleep(1)
        try:
            pages.append({"title": t, "html": parsed(t)})
        except Exception as e:   # a red link, a deleted page
            print("skip", t, e)
    (out / "pages.json").write_text(json.dumps(pages, ensure_ascii=False), encoding="utf-8")
    print(book, len(pages), "pages")


if __name__ == "__main__":
    for b in sys.argv[1:]:
        main(b)
