"""Lessons from a Wikibooks language course (CC BY-SA 4.0; vendor/wikibooks/<Book>/pages.json, tools/fetch_wikibooks.py):
each page of the book's table of contents, in its order, as a lesson; maintenance boxes, navigation and stubs left
out; links point back to Wikibooks, where each page's history names its authors."""
from __future__ import annotations

import re


def _drop(html: str, pattern: str) -> str:
    """remove every element whose opening tag matches `pattern`, with its content (nesting of the same tag counted)"""
    out = html
    while True:
        m = re.search(pattern, out)
        if not m:
            return out
        tag = re.match(r"<(\w+)", m.group(0)).group(1)
        depth, i = 0, m.start()
        for t in re.finditer(rf"<(/?){tag}\b[^>]*>", out[m.start():]):
            depth += -1 if t.group(1) else 1
            if depth == 0:
                out = out[:m.start()] + out[m.start() + t.end():]
                break
        else:
            out = out[:m.start()]


def clean(html: str) -> str:
    h = re.sub(r"<style.*?</style>", "", html, flags=re.S)
    h = re.sub(r"<!--.*?-->", "", h, flags=re.S)
    for pat in (r'<table[^>]*class="[^"]*(ambox|navbox|metadata|noprint|toccolours)[^"]*"[^>]*>', r'<div[^>]*class="[^"]*(noprint|navbox|toc|printfooter|mw-references|ambox|thumb)[^"]*"[^>]*>',
                r'<div[^>]*role="navigation"[^>]*>', r'<span[^>]*class="[^"]*mw-editsection[^"]*"[^>]*>'):
        h = _drop(h, pat)
    h = re.sub(r"<img[^>]*>", "", h)
    h = re.sub(r'href="/wiki/', 'href="https://en.wikibooks.org/wiki/', h)
    h = re.sub(r"<h[23]\b[^>]*>", "<h4>", h)
    h = re.sub(r"</h[23]>", "</h4>", h)
    return h.strip()


def _text_len(html: str) -> int:
    return len(re.sub(r"<[^>]+>|\s+", "", html))


def wikibooks_lessons(code: str, book: str, pages: list, index: dict, lessons: dict, questions: dict, levels: list | None = None,
                      rules: dict | None = None) -> int:
    levels = levels or [lv["id"] for lv in index["levels"]]
    topics = {lv["id"]: lv["topics"] for lv in index["levels"]}
    skip = re.compile(r"(print version|^contents$|restructuring|about|contribut|computing|authors|todo|sandbox|hover test)", re.I)
    keep = [(p["title"], clean(p["html"])) for p in pages if not skip.search(p["title"].split("/")[-1])]
    keep = [(t, h) for t, h in keep if _text_len(h) >= 300]
    per = {}
    for k, (title, h) in enumerate(keep):
        lv = levels[min(len(levels) - 1, k * len(levels) // max(1, len(keep)))]
        lid = f"{code}-wb-{k + 1}"
        parts = title.split("/")
        name = parts[-1]
        section = parts[-2] if len(parts) > 2 else book.replace("_", " ")
        url = "https://en.wikibooks.org/wiki/" + title.replace(" ", "_")
        credit = {"en": f'<p><small>From the Wikibooks course <a href="{url}">{title}</a> (CC BY-SA 4.0; authors in the page history).</small></p>',
                  "pt": f'<p><small>Do curso do Wikilivros <a href="{url}">{title}</a> (CC BY-SA 4.0; autores no histórico da página), em inglês.</small></p>'}
        page = {"id": lid, "title": name, "meaning": {"en": section, "pt": section}, "intro": credit,
                "sections": [{"id": "wikibooks", "title": {"en": "The lesson", "pt": "A lição"}, "html": {"en": h, "pt": h}}],
                "examples": [], "practice": [], "level": lv, "topic": {"en": f"Wikibooks: {section}", "pt": f"Wikilivros: {section}"},
                "source": f"Wikibooks, {title} (CC BY-SA 4.0)"}
        rule = next((r for word, r in (rules or {}).items() if word in title.lower()), None)
        if rule:
            page["match"] = rule
        lessons[lid] = page
        questions.setdefault(lv, {})[lid] = {"pools": {"gap": []}, "qs": []}
        per.setdefault((lv, section), []).append({"id": lid, "title": name, "meaning": page["meaning"]})
    for (lv, section), entries in per.items():
        topics[lv].append({"id": f"{lv}-wb-{section}", "kind": "grammar", "title": {"en": f"Wikibooks: {section}", "pt": f"Wikilivros: {section}"}, "lessons": entries})
    return len(keep)
