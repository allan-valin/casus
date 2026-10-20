"""Latin reference lessons from Allen and Greenough's *New Latin Grammar* in the Dickinson College Commentaries
edition (ed. Meagan Ayer; "freely available for re-use under a Creative Commons Attribution-ShareAlike license",
dcc.dickinson.edu/grammar/latin/credits-and-reuse; vendor/ag, fetched from the site): its 255 pages, each one or more
numbered sections, grouped by the book's own parts. A page whose title names a case, a mood or a verbal form gets a
rule for Tatoeba's Latin sentences, so it has exercises; the rest are for reading."""
from __future__ import annotations

import html
import re
from pathlib import Path

ITEM = re.compile(r'<li[^>]*class="(sf-depth-\d)[^"]*"[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]+)</a>')
CASES = {"nominative": "nom", "genitive": "gen", "dative": "dat", "accusative": "acc", "ablative": "abl", "vocative": "voc", "locative": "loc"}
MOODS = {"subjunctive": {"mood": "sub"}, "imperative": {"mood": "imp"}, "infinitive": {"mood": "inf"}, "indicative": {"mood": "ind"}}


def slug_of(href: str) -> str:
    return href.rstrip("#").rstrip("/").split("/")[-1].rstrip("#")


def menu_of(raw: str) -> list:
    """[(part title, [(page slug, page title), …]), …] in the book's order"""
    parts, current = [], None
    for depth, href, title in ITEM.findall(raw):
        title = html.unescape(title).strip()
        if depth == "sf-depth-1":
            current = (title, [])
            parts.append(current)
            # a part that is itself a page (Inflection → inflected-language) lists that page under it again
        elif current is not None:
            current[1].append((slug_of(href), title))
    return [(t, pages) for t, pages in parts if pages]


def page_of(raw: str) -> dict:
    start = raw.find('id="node-grammar-latin-full-group-main"')
    end = raw.find('id="node-grammar-latin-full-group-extras"', start)
    if start < 0:
        return {"html": "", "sections": []}
    body = raw[raw.find(">", start) + 1:end if end > 0 else len(raw)]
    body = body[:body.rfind("<div")] if end > 0 else body
    body = re.sub(r"<img[^>]*>", "", body)
    body = re.sub(r'<div class="suggestion">.*?</div>', "", body, flags=re.S)
    body = re.sub(r'\sstyle="[^"]*"', "", body)
    body = re.sub(r'href="/', 'href="https://dcc.dickinson.edu/', body)
    sections = re.findall(r"<strong>(\d+)\.</strong>", body)
    return {"html": body.strip(), "sections": list(dict.fromkeys(sections))}


def rule_for(title: str):
    t = title.lower()
    for word, case in CASES.items():
        if word in t:
            return {"seq": [{"pos": ["noun", "adj"], "case": case}], "same": ["number"]}
    for word, feat in MOODS.items():
        if word in t:
            return {"seq": [{"pos": "verb", **feat}], "same": ["person", "number"]}
    if "participle" in t:
        return {"seq": [{"pos": ["verb", "adj"], "mood": "part"}], "same": ["number"]}
    if "comparison" in t or "comparative" in t:
        return {"seq": [{"pos": "adj", "degree": ["comp", "sup"]}], "same": ["number"]}
    return None


def ag_lessons(folder: Path, index: dict, lessons: dict, questions: dict) -> int:
    folder = Path(folder)
    menu = menu_of((folder / "alphabet.html").read_text(encoding="utf-8"))
    level_id = "A&G"
    topics, n = [], 0
    for k, (part, pages) in enumerate(menu, 1):
        entries = []
        for slug, title in pages:
            f = folder / f"{slug}.html"
            if not f.exists() or slug in ("credits-and-reuse", "index"):
                continue
            p = page_of(f.read_text(encoding="utf-8"))
            if not p["html"]:
                continue
            lid = f"la-ag-{slug}"
            if lid in lessons:
                continue
            secs = ", ".join(f"§{s}" for s in p["sections"][:6]) + (" …" if len(p["sections"]) > 6 else "")
            page = {"id": lid, "title": title, "meaning": {"en": f"Allen & Greenough {secs}".strip(), "pt": f"Allen & Greenough {secs}".strip()},
                    "intro": {"en": "<p><small>From Allen and Greenough's <i>New Latin Grammar</i>, Dickinson College Commentaries edition (CC BY-SA).</small></p>",
                              "pt": "<p><small>Da <i>New Latin Grammar</i> de Allen e Greenough, edição Dickinson College Commentaries (CC BY-SA), em inglês.</small></p>"},
                    "sections": [{"id": "ag", "title": {"en": "The grammar", "pt": "A gramática"}, "html": {"en": p["html"], "pt": p["html"]}}],
                    "examples": [], "practice": [], "level": level_id, "topic": {"en": part, "pt": part},
                    "source": "Allen and Greenough, New Latin Grammar, ed. Meagan Ayer, Dickinson College Commentaries (CC BY-SA)"}
            rule = rule_for(title)
            if rule:
                page["match"] = rule
            lessons[lid] = page
            questions.setdefault(level_id, {})[lid] = {"pools": {"gap": []}, "qs": []}
            entries.append({"id": lid, "title": title, "meaning": page["meaning"]})
            n += 1
        if entries:
            topics.append({"id": f"ag-{k}", "kind": "grammar", "title": {"en": part, "pt": part}, "lessons": entries})
    if topics:
        index["levels"].append({"id": level_id, "reference": True, "title": {"en": "Reference grammar (Allen & Greenough)", "pt": "Gramática de referência (Allen & Greenough)"}, "topics": topics})
    return n
