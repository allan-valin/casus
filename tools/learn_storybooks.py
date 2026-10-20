"""Graded readers from Global Storybooks (global-asp and global-pb on GitHub; "released under a Creative Commons
Attribution 4.0 Licence" except where a story says otherwise): short illustrated children's stories from the African
Storybook Project, translated into many languages by named volunteers. Only stories whose own licence line is CC-BY
are used (the CC-BY-NC ones are left out). Each story is a lesson: its pages as paragraphs, each with 🗣, a button
that opens the whole story in the reader, and the story's credits. Shorter stories go to the first level."""
from __future__ import annotations

import html
import re
from pathlib import Path


def parse_story(md: str) -> dict:
    title = (re.search(r"^#\s+(.+)$", md, re.M) or [None, ""])[1].strip()
    pages, credits, licence = [], {}, ""
    for block in re.split(r"^##\s*$", md, flags=re.M)[1:]:
        lines = [l.strip() for l in block.strip().splitlines() if l.strip()]
        meta = [l for l in lines if l.startswith("* ")]
        if meta and len(meta) == len(lines):
            for l in meta:
                k, _, v = l[2:].partition(":")
                v = v.strip()
                if k.strip() == "License":
                    licence = v.strip("[]")
                else:
                    credits[k.strip()] = v
            continue
        text = " ".join(l for l in lines if not l.startswith("!["))
        if text:
            pages.append(text)
    return {"title": title, "pages": pages, "credits": credits, "licence": licence}


def storybook_lessons(code: str, folders: list, index: dict, lessons: dict, questions: dict) -> int:
    stories = []
    for folder in folders:
        for f in sorted(Path(folder).glob("[0-9]*.md")):
            s = parse_story(f.read_text(encoding="utf-8"))
            if s["licence"] == "CC-BY" and s["pages"]:
                s["file"] = f.stem
                stories.append(s)
    stories.sort(key=lambda s: sum(len(p.split()) for p in s["pages"]))
    levels = [lv["id"] for lv in index["levels"]][:2]
    topics = {lv["id"]: lv["topics"] for lv in index["levels"]}
    per = {}
    for k, s in enumerate(stories):
        lv = levels[min(len(levels) - 1, k * len(levels) // max(1, len(stories)))]
        lid = f"{code}-story-{s['file'][:4]}-{k + 1}"
        who = "; ".join(f"{html.escape(a)}: {html.escape(b)}" for a, b in s["credits"].items())
        credit = {"en": f'<p><small>From <a href="https://globalstorybooks.net/">Global Storybooks</a> (African Storybook Project), CC BY 4.0. {who}.</small></p>',
                  "pt": f'<p><small>Do <a href="https://globalstorybooks.net/">Global Storybooks</a> (African Storybook Project), CC BY 4.0. {who}.</small></p>'}
        body = "".join(f'<p class="say">{html.escape(p)}</p>' for p in s["pages"])
        words = sum(len(p.split()) for p in s["pages"])
        meaning = {"en": f"a short story ({words} words)", "pt": f"uma história curta ({words} palavras)"}
        lessons[lid] = {"id": lid, "title": s["title"], "meaning": meaning, "intro": credit,
                        "sections": [{"id": "story", "title": {"en": "The story", "pt": "A história"}, "html": {"en": body, "pt": body}}],
                        "examples": [], "practice": [], "level": lv, "read": "\n".join(s["pages"]),
                        "topic": {"en": "Storybooks", "pt": "Histórias"}, "source": "Global Storybooks, CC BY 4.0"}
        questions.setdefault(lv, {})[lid] = {"pools": {"gap": []}, "qs": []}
        per.setdefault(lv, []).append({"id": lid, "title": s["title"], "meaning": meaning})
    for lv, entries in per.items():
        topics[lv].append({"id": f"{lv}-storybooks", "kind": "grammar", "title": {"en": "Storybooks (Global Storybooks, CC BY)", "pt": "Histórias (Global Storybooks, CC BY)"}, "lessons": entries, "group": "reader"})
    return len(stories)
