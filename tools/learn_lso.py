"""Sanskrit lessons from the learnsanskrit.org guide (Arun Prasad and contributors; every page "is available under a
CC BY 4.0 International license"; vendor/learnsanskrit/html, fetched from the site): about a hundred graded lessons —
sounds, sandhi, nominals, verbs, indeclinables, suffixes, compounds, sentences. Imported as written; an inline word
in IAST gets its Devanagari beside it (the site switches scripts with JavaScript); the nominal and verb lessons get a
rule for the corpus sentences, so they have exercises."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

from build_dcs import iast_to_deva

LEVEL = {"introduction": 0, "core": 0, "sounds": 0, "devanagari": 0, "sandhi": 0, "nominals-1": 0, "uninflected-words": 0,
         "nominals-2": 1, "verbs-1": 0, "verbs-2": 1, "verbs-3": 1, "suffixes": 1, "compounds": 1, "sentences": 1}
RULES = {"nominals-1": {"seq": [{"pos": "noun", "case": ["nom", "acc", "ins", "dat", "abl", "gen", "loc"]}], "same": ["number"]},
         "nominals-2": {"seq": [{"pos": ["noun", "adj"], "case": ["nom", "acc", "ins", "dat", "abl", "gen", "loc"]}], "same": ["number"]},
         "verbs-1": {"seq": [{"pos": "verb", "re": "(ति|न्ति|सि|ामि|ामः)$"}], "suffixes": ["ति", "तः", "न्ति", "सि", "थः", "ामि", "ावः", "ामः"], "attested": True},
         "verbs-2": {"seq": [{"pos": "verb"}], "same": ["person", "number"]},
         "verbs-3": {"seq": [{"pos": "verb"}], "same": ["person", "number"]}}
INLINE = re.compile(r'<span lang="sa" class="sa2">([^<]+)</span>')


def page_of(raw: str, topic: str, slug: str) -> dict:
    art = raw[raw.find("<article"):raw.find("</article>")]
    art = art[art.find(">") + 1:]
    m = re.search(r"<h1>(.*?)</h1>", art, re.S)
    title = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else slug
    body = art[m.end():] if m else art
    body = re.sub(r"<script.*?</script>", "", body, flags=re.S)

    def deva(mm):
        word = html.unescape(mm.group(1))
        # (an ending, -a, -ena, stays in IAST: its Devanagari would be a vowel letter, not the ending's sign)
        if not re.search(r"[a-zāīūṛṝḷṅñṭḍṇśṣḥṃ]", word) or len(word) > 60 or word.startswith("-") or "-" in word:
            return mm.group(0)
        d = " ".join(iast_to_deva(w) for w in word.split())
        return f'<span lang="sa">{html.escape(d)}</span> <i>{mm.group(1)}</i>'

    # inline words outside the tables (the tables already show both scripts)
    parts = re.split(r"(<table.*?</table>)", body, flags=re.S)
    body = "".join(p if p.startswith("<table") else INLINE.sub(deva, p) for p in parts)
    body = re.sub(r'href="/', 'href="https://www.learnsanskrit.org/', body)
    body = re.sub(r"<h2>", "<h4>", body).replace("</h2>", "</h4>")
    return {"title": title, "html": body.strip()}


def lso_lessons(root: Path, index: dict, lessons: dict, questions: dict) -> int:
    root = Path(root)
    content = root / "content" / "guide"
    levels = [lv["id"] for lv in index["levels"]]
    topics = {lv["id"]: lv["topics"] for lv in index["levels"]}
    n = 0
    for topic in json.loads((content / "index.json").read_text(encoding="utf-8"))["topics"]:
        if topic not in LEVEL:
            continue
        meta = json.loads((content / topic / "index.json").read_text(encoding="utf-8"))
        lv = levels[min(LEVEL[topic], len(levels) - 1)]
        entries = []
        for slug in meta.get("lessons", []):
            f = root / "html" / f"{topic}__{slug}.html"
            if not f.exists():
                continue
            p = page_of(f.read_text(encoding="utf-8"), topic, slug)
            lid = f"sa-lso-{topic}-{slug}"
            page = {"id": lid, "title": p["title"], "meaning": {"en": meta.get("title", topic), "pt": meta.get("title", topic)},
                    "intro": {"en": "<p><small>From the learnsanskrit.org guide (CC BY 4.0).</small></p>",
                              "pt": "<p><small>Do guia learnsanskrit.org (CC BY 4.0), com explicações em inglês.</small></p>"},
                    "sections": [{"id": "guide", "title": {"en": "The lesson", "pt": "A lição"}, "html": {"en": p["html"], "pt": p["html"]}}],
                    "examples": [], "practice": [], "level": lv, "topic": {"en": meta.get("title", topic), "pt": meta.get("title", topic)},
                    "source": "learnsanskrit.org guide (CC BY 4.0)"}
            if topic in RULES:
                page["match"] = RULES[topic]
            lessons[lid] = page
            questions.setdefault(lv, {})[lid] = {"pools": {"gap": []}, "qs": []}
            entries.append({"id": lid, "title": p["title"], "meaning": page["meaning"]})
            n += 1
        if entries:
            topics[lv].append({"id": f"{lv}-lso-{topic}", "kind": "grammar", "title": {"en": f"Guide: {meta.get('short_title', meta.get('title', topic))}", "pt": f"Guia: {meta.get('short_title', meta.get('title', topic))}"}, "lessons": entries})
    return n
