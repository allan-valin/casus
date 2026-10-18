#!/usr/bin/env python3
"""Raw word lists for the phrase and frequency drills (Allan, 2026-10-18); tools/build_wordlists.mjs finishes them.

usage: python3 tools/build_wordlists.py la|grc|de   -> vendor/wordlists/<code>/phrases.raw.json, frequency.raw.json
(build inputs, not published; tools/build_wordlists.mjs writes the finished lists into data/<code>/)

Phrases: multi-word Wiktionary entries (wiktextract dump, CC BY-SA) that are proverbs, idioms, or set phrases,
with their meaning. Left out: single words, cross-references ("synonym of", "form of"), entries whose meaning
just repeats them, names, and vulgar or offensive senses.
Frequency: Latin and Greek from the Dickinson College Commentaries core vocabularies (CC BY-SA; ~1000 Latin,
~500 Greek lemmas ranked by frequency); German from the FrequencyWords OpenSubtitles list (hermitdave, CC BY-SA
4.0), word forms the .mjs step turns into dictionary words."""
from __future__ import annotations

import html as htmllib
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DUMPS = {"la": "Latin", "grc": "AncientGreek", "de": "German"}
CORE = {"la": "https://dcc.dickinson.edu/latin-core-list1", "grc": "https://dcc.dickinson.edu/greek-core-list"}
DE_FREQ = "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt"
SKIP_TAGS = {"vulgar", "offensive", "derogatory", "ethnic", "slur"}
XREF = re.compile(r"^(synonym|alternative (form|spelling)|[\w-]+ form|abbreviation|misspelling|obsolete form|archaic form|initialism|contraction) of\b", re.I)


def phrase_item(d: dict) -> dict | None:
    word = (d.get("word") or "").strip()
    pos = d.get("pos")
    if " " not in word or pos == "name":
        return None
    senses = d.get("senses") or []
    tags = {t for s in senses for t in (s.get("tags") or [])}
    if tags & SKIP_TAGS:
        return None
    cats = {(c.get("name", "") if isinstance(c, dict) else str(c)).lower() for s in senses for c in (s.get("categories") or [])}
    if pos == "proverb":
        kind = "proverb"
    elif "idiomatic" in tags or any("idioms" in c for c in cats):
        kind = "idiom"
    elif pos == "phrase":
        kind = "phrase"
    else:
        return None
    gloss = next((g for s in senses if not (set(s.get("tags") or []) & SKIP_TAGS) for g in (s.get("glosses") or [])), "").strip()
    if not gloss or XREF.match(gloss) or gloss.lower().strip(" .!?") == word.lower().strip(" .!?"):
        return None
    return {"p": word, "kind": kind, "en": gloss[:160]}


def parse_core_rows(page: str) -> list[dict]:
    out = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", page, re.S):
        cells = [htmllib.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
        if len(cells) >= 5 and cells[4].isdigit():
            out.append({"w": re.sub(r"\s+", " ", cells[0]), "en": re.sub(r"\s+", " ", cells[1]), "pos": cells[2], "rank": int(cells[4])})
    return sorted(out, key=lambda r: r["rank"])


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "casus-build (open-source reader; github.com/allan-valin/casus)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8")


def main(code: str) -> None:
    out_dir = ROOT / "vendor" / "wordlists" / code
    out_dir.mkdir(parents=True, exist_ok=True)
    phrases, seen = [], set()
    with open(ROOT / "vendor" / "wiktextract" / f"kaikki.org-dictionary-{DUMPS[code]}.jsonl", encoding="utf-8") as f:
        for line in f:
            item = phrase_item(json.loads(line))
            if item and item["p"] not in seen:
                seen.add(item["p"])
                phrases.append(item)
    (out_dir / "phrases.raw.json").write_text(json.dumps(phrases, ensure_ascii=False), encoding="utf-8")
    if code in CORE:
        freq = parse_core_rows(fetch(CORE[code]))
    else:
        freq = [{"form": w, "n": int(n)} for w, n in (l.split() for l in fetch(DE_FREQ).splitlines()[:8000] if len(l.split()) == 2)]
    (out_dir / "frequency.raw.json").write_text(json.dumps(freq, ensure_ascii=False), encoding="utf-8")
    counts = ", ".join(f"{k} {sum(1 for p in phrases if p['kind'] == k)}" for k in ("phrase", "idiom", "proverb"))
    print(f"{code}: {len(phrases)} phrases ({counts}), {len(freq)} frequency rows")


if __name__ == "__main__":
    main(sys.argv[1])
