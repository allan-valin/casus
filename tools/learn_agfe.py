"""Ancient Greek lessons from *Ancient Greek for Everyone* (Wilfred E. Major and Michael Laughy, Pressbooks 2018,
CC BY 4.0, pressbooks.pub/ancientgreek; vendor/agfe/html, fetched by tools/fetch_agfe.mjs): one lesson per chapter,
its parts (explanation, key terms, vocabulary, exercises, readings) as sections, photos left out (they are the
book's "otherwise noted" material). The book's Greek exercise sentences have no key, so they are not questions; they
go to vendor/corpora/grc/ as more sentences the Learn exercises are cut from."""
from __future__ import annotations

import html
import re
from pathlib import Path

from learn_wikibooks import _drop

URL = "https://pressbooks.pub/ancientgreek/chapter/{n}/"
CREDIT = {"en": "From <i>Ancient Greek for Everyone</i> by Wilfred E. Major and Michael Laughy, CC BY 4.0 (in English)",
          "pt": "De <i>Ancient Greek for Everyone</i>, de Wilfred E. Major e Michael Laughy, CC BY 4.0 (em inglês)"}
GREEK = re.compile(r"[Ͱ-Ͽἀ-῿]")


def _text(h: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", h))).strip()


def _body(raw: str) -> str:
    i = raw.find("<section")
    body = raw[i:raw.find("</section>", i)]
    body = re.sub(r"<header>.*?</header>", "", body, flags=re.S)
    for pat in (r"<figure\b[^>]*>", r"<iframe\b[^>]*>", r"<script\b[^>]*>"):
        body = _drop(body, pat)
    body = re.sub(r"<img[^>]*>", "", body)
    return re.sub(r'\s(style|srcset|sizes|class|id|tabindex)="[^"]*"', "", body)


def chapter(raw: str) -> list:
    """the chapter's parts, split at its h2 headings (an empty heading is a spacer: its content joins the part before)"""
    parts = re.split(r"(<h[23]\b[^>]*>.*?</h[23]>)", _body(raw), flags=re.S)
    out = []
    for k in range(1, len(parts), 2):
        title, content = _text(parts[k]), (parts[k + 1] if k + 1 < len(parts) else "").strip()
        if not title:
            if out and content:
                out[-1]["html"] += content
            elif content:
                out.append({"title": "", "html": content})
            continue
        out.append({"title": title, "html": content})
    return [p for p in out if _text(p["html"])]


def exercise_sentences(raw: str) -> list:
    """the Greek sentences listed in the chapter's Exercises part"""
    for p in chapter(raw):
        if p["title"].lower().startswith("exercise"):
            items = [_text(x) for x in re.findall(r"<li\b[^>]*>(.*?)</li>", p["html"], re.S)]
            return [x for x in items if len(GREEK.findall(x)) > len(x) // 2]
    return []


def agfe_lessons(folder: Path, titles: dict, index: dict, lessons: dict, questions: dict, levels: dict, rules: dict) -> int:
    """titles: chapter number → its title (from the book's contents); levels: chapter number → level id; rules: chapter
    number → a match rule for the Tatoeba and corpus sentences (tools/learn_match.mjs)"""
    folder = Path(folder)
    topics = {lv["id"]: lv["topics"] for lv in index["levels"]}
    per = {}
    for n, title in sorted(titles.items()):
        f = folder / f"chapter__{n}.html"
        if not f.exists():
            continue
        parts = chapter(f.read_text(encoding="utf-8"))
        lid, lv = f"grc-agfe-{n}", levels[n]
        link = {k: f'<p><small><a href="{URL.format(n=n)}">{n}. {html.escape(title)}</a> — {CREDIT[k]}.</small></p>' for k in ("en", "pt")}
        page = {"id": lid, "title": f"{n}. {title}", "meaning": {"en": title, "pt": title}, "intro": link,
                "sections": [{"id": f"part-{j}", "title": {"en": p["title"] or title, "pt": p["title"] or title}, "html": {"en": p["html"], "pt": p["html"]}}
                             for j, p in enumerate(parts)],
                "examples": [], "practice": [], "level": lv, "topic": {"en": "Ancient Greek for Everyone", "pt": "Ancient Greek for Everyone"},
                "source": "Ancient Greek for Everyone (Major & Laughy), CC BY 4.0"}
        if rules.get(n):
            page["match"] = rules[n]
        lessons[lid] = page
        questions.setdefault(lv, {})[lid] = {"pools": {"gap": []}, "qs": []}
        per.setdefault(lv, []).append({"id": lid, "title": page["title"], "meaning": page["meaning"]})
    for lv, entries in per.items():
        topics[lv].append({"id": f"{lv}-agfe", "kind": "grammar", "title": {"en": "Ancient Greek for Everyone (Major & Laughy)", "pt": "Ancient Greek for Everyone (Major & Laughy)"}, "lessons": entries})
    return sum(len(e) for e in per.values())
