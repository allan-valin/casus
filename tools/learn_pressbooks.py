"""Lessons from an openly licensed Pressbooks textbook (vendor/<book>/: the chapter pages, fetched politely): each
chapter split at its section headings, one lesson per section; photos and embedded H5P activities left out (they
live on the book's site, linked from each lesson); the book's text boxes (objectives, vocabulary, grammar) kept.
Used for Bate-Papo (Portuguese, University of Washington, CC BY 4.0)."""
from __future__ import annotations

import html
import re
from pathlib import Path

from learn_wikibooks import _drop


def _text(h: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", h)).strip()


def chapter_sections(raw: str) -> tuple[str, list]:
    i = raw.find("<section")
    j = raw.find("</section>", i)
    body = raw[i:j]
    m = re.search(r'<h1 class="entry-title">(.*?)</h1>', body, re.S)
    title = re.sub(r"\s+", " ", _text(m.group(1))) if m else ""
    body = body[m.end():] if m else body
    body = re.sub(r'<p data-type="author">.*?</p>', "", body, flags=re.S)
    for pat in (r"<figure\b[^>]*>", r"<iframe\b[^>]*>", r'<div[^>]*class="[^"]*h5p[^"]*"[^>]*>', r"<script\b[^>]*>"):
        body = _drop(body, pat)
    body = re.sub(r"<img[^>]*>", "", body)
    body = re.sub(r'\s(style|srcset|sizes)="[^"]*"', "", body)
    parts = re.split(r"(<h1\b[^>]*>.*?</h1>)", body, flags=re.S)
    secs = []
    for k in range(1, len(parts), 2):
        t = re.sub(r"\s+", " ", _text(parts[k]))
        content = parts[k + 1] if k + 1 < len(parts) else ""
        content = re.sub(r"<h2\b[^>]*>", "<h4>", content).replace("</h2>", "</h4>")
        if not t or len(_text(content)) < 80:
            # an empty heading (the book uses them as spacers): its text joins the previous section
            if secs and content.strip():
                secs[-1]["html"] += content
            continue
        secs.append({"title": t, "html": content.strip()})
    if not secs and len(_text(parts[0])) >= 80:
        # no section headings (an anthology's chapter: one text): the whole chapter is one section
        secs.append({"title": title, "html": re.sub(r"<h2\b[^>]*>", "<h4>", parts[0]).replace("</h2>", "</h4>").strip()})
    return title, secs


def pressbooks_lessons(folder: Path, chapters: list, prefix: str, credit: dict, source: str, url_of, levels: list,
                       index: dict, lessons: dict, questions: dict, group: str | None = None) -> int:
    """chapters: the chapter slugs in book order; their sections spread over `levels` in order"""
    folder = Path(folder)
    all_secs = []
    for slug in chapters:
        f = folder / f"{slug}.html"
        if f.exists():
            title, secs = chapter_sections(f.read_text(encoding="utf-8"))
            all_secs += [(slug, title, s) for s in secs]
    topics = {lv["id"]: lv["topics"] for lv in index["levels"]}
    per = {}
    for k, (slug, chapter, s) in enumerate(all_secs):
        lv = levels[min(len(levels) - 1, k * len(levels) // max(1, len(all_secs)))]
        lid = f"{prefix}-{k + 1}"
        link = f'<p><small><a href="{url_of(slug)}">{html.escape(chapter)}</a> — {credit["en"]}</small></p>'
        link_pt = f'<p><small><a href="{url_of(slug)}">{html.escape(chapter)}</a> — {credit["pt"]}</small></p>'
        page = {"id": lid, "title": s["title"], "meaning": {"en": chapter, "pt": chapter}, "intro": {"en": link, "pt": link_pt},
                "sections": [{"id": "book", "title": {"en": "The lesson", "pt": "A lição"}, "html": {"en": s["html"], "pt": s["html"]}}],
                "examples": [], "practice": [], "level": lv, "topic": {"en": chapter, "pt": chapter}, "source": source}
        lessons[lid] = page
        questions.setdefault(lv, {})[lid] = {"pools": {"gap": []}, "qs": []}
        per.setdefault((lv, chapter), []).append({"id": lid, "title": s["title"], "meaning": page["meaning"]})
    for (lv, chapter), entries in per.items():
        topics[lv].append({"id": f"{lv}-{prefix}-{chapter}", "kind": "grammar", "title": {"en": chapter, "pt": chapter}, "lessons": entries,
                                 **({"group": group} if group else {})})
    return len(all_secs)
