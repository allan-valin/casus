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


SKIP = re.compile(r"(print version|contents|restructuring|about|contribut|computing|authors|todo|to do|glossary of terms|resources|external links|sandbox)", re.I)


def links_of(html, book):
    out = []
    for href in re.findall(r'href="/wiki/([^"#?]+)"', html):
        t = urllib.parse.unquote(href).replace("_", " ")
        if t.startswith(book.replace("_", " ") + "/") and t not in out:
            out.append(t)
    return out


def main(book):
    """the book's pages in the order of its table of contents: the main page's links, and the links of an index page
    (Contents, Level I…) in its place, one level down"""
    out = ROOT / "vendor" / "wikibooks" / book
    out.mkdir(parents=True, exist_ok=True)
    order, pages, seen = [], [], set()
    first = links_of(parsed(book), book)
    for t in first:
        time.sleep(1)
        try:
            h = parsed(t)
        except Exception as e:   # a red link, a deleted page
            print("skip", t, e)
            continue
        inner = [x for x in links_of(h, book) if x not in first and x not in seen]
        if not SKIP.search(t.split("/")[-1]) or not inner:
            if not SKIP.search(t.split("/")[-1]):
                pages.append({"title": t, "html": h}); seen.add(t)
        # an index page: its own links follow it, in order
        if len(inner) >= 3:
            for x in inner:
                if x in seen or SKIP.search(x.split("/")[-1]):
                    continue
                time.sleep(1)
                try:
                    pages.append({"title": x, "html": parsed(x)}); seen.add(x)
                except Exception as e:
                    print("skip", x, e)
    (out / "pages.json").write_text(json.dumps(pages, ensure_ascii=False), encoding="utf-8")
    print(book, len(pages), "pages")


if __name__ == "__main__":
    for b in sys.argv[1:]:
        main(b)
