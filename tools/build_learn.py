#!/usr/bin/env python3
"""The Learn tab's lessons (Allan, 2026-10-19; design 2026-10-19-learn-and-three-sites-design.md §2):
data/<code>/learn.json — levels, each with units of lessons, each lesson with what the page needs to teach and to
ask about it. Japanese from OpenJLPT (CC BY-SA 4.0: grammar points written by its contributors, vocabulary and kanji
levels from Jonathan Waller, CC BY), vendored in vendor/openjlpt/.

Usage: python3 tools/build_learn.py ja"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def units_of(items: list, size: int) -> list[list]:
    """items in groups of `size`, in order; a tail shorter than half a group joins the group before it"""
    groups = [items[k:k + size] for k in range(0, len(items), size)]
    if len(groups) > 1 and len(groups[-1]) < size / 2:
        tail = groups.pop()
        groups[-1] = groups[-1] + tail
    return groups


def _rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def ja_learn(src: Path) -> dict:
    levels = []
    for n in ("N5", "N4", "N3", "N2", "N1"):
        units = []
        grammar = [{"id": f"ja-{r['id']}", "kind": "grammar", "pattern": r["pattern"], "romaji": r["romaji"], "meaning": {"en": r["meaning"]},
                    "formation": r["formation"], "examples": [{"text": r["example_ja"], "en": r["example_en"]}] if r["example_ja"] else [],
                    "notes": {"en": r["notes"]} if r["notes"] else {}, "source": "OpenJLPT"} for r in _rows(src / f"grammar-{n.lower()}.csv")]
        for k, group in enumerate(units_of(grammar, 6), 1):
            units.append({"id": f"ja-{n}-g{k}", "kind": "grammar", "n": k, "title": " · ".join(g["pattern"] for g in group), "lessons": group})
        words = [{"w": r["word"], "reading": r["reading"], "en": r["meanings"].split(";")[0].strip()} for r in _rows(src / f"vocab-{n.lower()}.csv") if r["word"]]
        for k, group in enumerate(units_of(words, 40), 1):
            units.append({"id": f"ja-{n}-v{k}", "kind": "vocab", "n": k, "title": " · ".join(w["w"] for w in group[:4]) + " …",
                          "lessons": [{"id": f"ja-{n}-v{k}", "kind": "vocab", "words": group, "source": "OpenJLPT (levels: J. Waller)"}]})
        kanji = [{"k": r["character"], "on": r["onyomi"], "kun": r["kunyomi"], "en": r["meanings"].split(";")[0].strip(),
                  "words": [w.strip() for w in r["words"].split(";") if w.strip()][:4]} for r in _rows(src / f"kanji-{n.lower()}.csv")]
        for k, group in enumerate(units_of(kanji, 20), 1):
            units.append({"id": f"ja-{n}-k{k}", "kind": "kanji", "n": k, "title": "".join(c["k"] for c in group[:8]) + " …",
                          "lessons": [{"id": f"ja-{n}-k{k}", "kind": "kanji", "kanji": group, "source": "OpenJLPT (KANJIDIC, levels: J. Waller)"}]})
        levels.append({"id": n, "units": units})
    return {"system": "JLPT", "levels": levels,
            "credit": "OpenJLPT (github.com/evanclan/OpenJLPT), CC BY-SA 4.0; levels after Jonathan Waller's JLPT resources (CC BY)"}


BUILDERS = {"ja": lambda: ja_learn(ROOT / "vendor" / "openjlpt")}


def main(code: str) -> None:
    out = BUILDERS[code]()
    path = ROOT / "data" / code / "learn.json"
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    counts = {lv["id"]: sum(len(u["lessons"]) for u in lv["units"]) for lv in out["levels"]}
    print(f"{code}: {counts} lessons, {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
