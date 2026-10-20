#!/usr/bin/env python3
"""Fetch a Wikibooks book (CC BY-SA 4.0) for Learn: its main page's links in their order (the book's own table of
contents), then each linked subpage's rendered HTML, one request a second. Writes vendor/wikibooks/<Book>/pages.json
= [{title, html}]. Usage: fetch_wikibooks.py Russian [more books…]"""
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = "https://en.wikibooks.org/w/api.php"   # main() points it at another edition for "pt:Inglês"
UA = {"User-Agent": "Casus/1.0 (https://allan-valin.github.io/casus/; language-learning site, open source)"}


def get(params):
    q = urllib.parse.urlencode({**params, "format": "json", "formatversion": 2})
    for attempt in range(6):          # Wikimedia answers 429 when asked too fast: wait longer each time
        try:
            with urllib.request.urlopen(urllib.request.Request(f"{API}?{q}", headers=UA), timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 5:
                raise
            time.sleep(30 * (attempt + 1))


def parsed(title):
    return get({"action": "parse", "page": title, "prop": "text", "disableeditsection": 1, "redirects": 1})["parse"]["text"]


SKIP = re.compile(r"(print version|contents|restructuring|about|contribut|computing|authors|todo|to do|glossary of terms|resources|external links|sandbox)", re.I)


ROMAN = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100}


def _roman(s):
    total = 0
    for a, b in zip(s, s[1:] + " "):
        v = ROMAN[a]
        total += -v if ROMAN.get(b, 0) > v else v
    return total


def book_order(names):
    """subpage names in reading order: front matter first, then numbered parts by their number (Roman or Arabic)"""
    def key(n):
        m = re.search(r"\b([IVXLC]+|\d+)\b\s*$", n) or re.search(r"\b([IVXLC]+|\d+)\b", n)
        if not m:
            return (0 if re.match(r"(?i)(preface|introduction|einleitung|préface|prefacio|предисловие)", n) else 1, 0, n)
        v = m.group(1)
        return (2, int(v) if v.isdigit() else _roman(v), n)
    return sorted(names, key=key)


def split_page(book, html):
    """a book that is one long page, cut at its second-level headings: [{title, html}]"""
    parts = re.split(r"<h2\b[^>]*>(.*?)</h2>", html, flags=re.S)
    out = []
    if re.sub(r"<[^>]+>", "", parts[0]).strip():
        out.append({"title": f"{book}/Introduction", "html": parts[0]})
    for i in range(1, len(parts), 2):
        name = re.sub(r"<[^>]+>", "", parts[i]).strip() or f"Part {i // 2 + 1}"
        out.append({"title": f"{book}/{name}", "html": parts[i + 1]})
    return out


def subpages(book):
    """the book's subpages from the wiki's page list, in reading order"""
    got = get({"action": "query", "list": "allpages", "apprefix": book + "/", "aplimit": 500})["query"]["allpages"]
    names = [p["title"].split("/", 1)[1] for p in got]
    return [f"{book}/{n}" for n in book_order(names)]


def links_of(html, book):
    out = []
    for href in re.findall(r'href="/wiki/([^"#?]+)"', html):
        t = urllib.parse.unquote(href).replace("_", " ")
        if t.startswith(book.replace("_", " ") + "/") and t not in out:
            out.append(t)
    return out


def main(spec):
    """`spec` is a book of the English edition (Russian) or edition:book (pt:Inglês → vendor/wikibooks/pt/Inglês).
    the book's pages in the order of its table of contents: the main page's links, and the links of an index page
    (Contents, Level I…) in its place, one level down"""
    global API
    edition, book = spec.split(":", 1) if ":" in spec else ("en", spec)
    site = "wikibooks"
    spec_book = book.partition("@")[0]; book = spec_book   # "@school" is for the build, not the wiki
    if edition.startswith("ws-"):          # ws-fr:Title — a public-domain book on Wikisource
        site, edition = "wikisource", edition[3:]
    elif edition.startswith("wv-"):        # wv-fr:Latin — a Wikiversity course (CC BY-SA)
        site, edition = "wikiversity", edition[3:]
    API = f"https://{edition}.{site}.org/w/api.php"
    out = ROOT / "vendor" / site / edition / book if site != "wikibooks" else ROOT / "vendor" / "wikibooks" / (book if edition == "en" else f"{edition}/{book}")
    out.mkdir(parents=True, exist_ok=True)
    order, pages, seen = [], [], set()
    try:
        main_html = parsed(book)
    except KeyError:                       # no root page, only subpages (de: "Englisch: Grammatik/…")
        main_html = ""
    first = links_of(main_html, book)
    if len(first) < 3:                     # Wikisource: no table of contents on the main page
        first = subpages(book) or first
    if not first:                          # one long page
        pages = split_page(book, main_html)
        (out / "pages.json").write_text(json.dumps(pages, ensure_ascii=False), encoding="utf-8")
        print(book, len(pages), "sections of one page")
        return
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
