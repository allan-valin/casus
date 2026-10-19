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


def _gap(furi: list, target: str) -> list | None:
    """the sentence with its first piece equal to the target replaced by a blank"""
    out, done = [], False
    for text, reading in furi:
        if not done and reading is None and text == target:
            out.append(["＿＿", None])
            done = True
        else:
            out.append([text, reading])
    return out if done else None


def ja_learn(book: Path, openjlpt: Path) -> tuple[dict, dict, dict]:
    """(index, lessons by id, questions by level and lesson) — grammar from JLPT Grammar Enhanced in its own
    teaching order and topics, vocabulary and kanji by level from OpenJLPT"""
    from learn_ja import parse_page, summary
    levels, lessons, questions = [], {}, {}
    plan = {lv["level"]: lv["topics"] for lv in summary((book / "SUMMARY.md").read_text(encoding="utf-8"))}
    for n in ("N5", "N4", "N3", "N2", "N1"):
        topics = []
        for t_k, topic in enumerate(plan.get(n, []), 1):
            entries = []
            for path in topic["pages"]:
                f = book / path
                if not f.exists():
                    continue
                lesson = parse_page(f.read_text(encoding="utf-8"))
                lid = f"{n.lower()}-{f.stem.split('-')[0]}"
                lesson.update({"id": lid, "level": n, "topic": topic["title"], "source": "JLPT Grammar Enhanced (CC BY-SA 4.0)"})
                lessons[lid] = lesson
                entries.append({"id": lid, "title": lesson["title"], "meaning": lesson["meaning"]})
            if entries:
                topics.append({"id": f"ja-{n}-t{t_k}", "kind": "grammar", "title": topic["title"], "lessons": entries})
        # questions: the gap in each example (the bold part), its translation, the lesson's meaning
        level_lessons = [lessons[e["id"]] for t in topics for e in t["lessons"]]
        targets = sorted({ex["target"] for l in level_lessons for ex in l["examples"] if ex["target"]})
        meanings = [l["meaning"] for l in level_lessons if l["meaning"]]
        qs = {}
        for l in level_lessons:
            mine = []
            sentences = [ex["en"] for ex in l["examples"]]
            for ex in l["examples"]:
                gap = _gap(ex["furi"], ex["target"]) if ex["target"] else None
                if gap:
                    mine.append({"type": "gap", "furi": gap, "en": ex["en"], "answer": ex["target"]})
                mine.append({"type": "translate", "furi": ex["furi"], "kana": ex["kana"], "answer": ex["en"]})
            if l["meaning"]:
                mine.append({"type": "meaning", "prompt": l["title"], "answer": l["meaning"], "pool": [m for m in meanings if m != l["meaning"]][:60]})
            # wrong answers for the gaps are stored once per file: the level's patterns (questionsFromFile)
            qs[l["id"]] = {"pools": {"gap": targets[:80]}, "qs": mine}
        questions[n] = qs
        words = [{"w": r["word"], "reading": r["reading"], "en": r["meanings"].split(";")[0].strip()} for r in _rows(openjlpt / f"vocab-{n.lower()}.csv") if r["word"]]
        groups = units_of(words, 40)
        if groups:
            topics.append({"id": f"ja-{n}-words", "kind": "vocab", "title": "Words", "lessons": [
                {"id": f"{n.lower()}-v{k}", "title": " · ".join(w["w"] for w in g[:3]) + " …", "meaning": f"{len(g)} words"} for k, g in enumerate(groups, 1)]})
            for k, g in enumerate(groups, 1):
                lessons[f"{n.lower()}-v{k}"] = {"id": f"{n.lower()}-v{k}", "kind": "vocab", "level": n, "words": g, "source": "OpenJLPT (levels: J. Waller, CC BY)"}
        kanji = [{"k": r["character"], "on": r["onyomi"], "kun": r["kunyomi"], "en": r["meanings"].split(";")[0].strip(),
                  "words": [w.strip() for w in r["words"].split(";") if w.strip()][:4]} for r in _rows(openjlpt / f"kanji-{n.lower()}.csv")]
        kgroups = units_of(kanji, 20)
        if kgroups:
            topics.append({"id": f"ja-{n}-kanji", "kind": "kanji", "title": "Kanji", "lessons": [
                {"id": f"{n.lower()}-k{k}", "title": "".join(c["k"] for c in g[:8]) + " …", "meaning": f"{len(g)} kanji"} for k, g in enumerate(kgroups, 1)]})
            for k, g in enumerate(kgroups, 1):
                lessons[f"{n.lower()}-k{k}"] = {"id": f"{n.lower()}-k{k}", "kind": "kanji", "level": n, "kanji": g, "source": "OpenJLPT (KANJIDIC, CC BY-SA)"}
        levels.append({"id": n, "topics": topics})
    index = {"system": "JLPT", "levels": levels,
             "credit": "Grammar: JLPT Grammar Enhanced (github.com/maitodesu/jlpt-grammar-enhanced), CC BY-SA 4.0. Words and kanji: OpenJLPT (CC BY-SA 4.0), levels after Jonathan Waller (CC BY)."}
    return index, lessons, questions


BUILDERS = {"ja": lambda: ja_learn(ROOT / "vendor" / "jlpt-grammar-enhanced", ROOT / "vendor" / "openjlpt")}


def main(code: str) -> None:
    """data/<code>/learn.json (the index), learn/<lesson>.json (one lesson), learn/questions-<level>.json"""
    index, lessons, questions = BUILDERS[code]()
    out = ROOT / "data" / code
    folder = out / "learn"
    if folder.exists():
        for f in folder.glob("*.json"):
            f.unlink()
    folder.mkdir(parents=True, exist_ok=True)
    # questions in one file per lesson (hundreds per lesson once the Tatoeba ones are added: tools/learn_examples.mjs)
    per_lesson = {lid: qs for lv in questions.values() for lid, qs in lv.items()}
    index["files"] = [f"learn/{lid}.json" for lid in lessons] + [f"learn/q-{lid}.json" for lid in per_lesson]
    dump = lambda obj: json.dumps(obj, ensure_ascii=False, separators=(",", ":"))   # noqa: E731
    (out / "learn.json").write_text(dump(index), encoding="utf-8")
    for lid, lesson in lessons.items():
        (folder / f"{lid}.json").write_text(dump(lesson), encoding="utf-8")
    for lid, qs in per_lesson.items():
        (folder / f"q-{lid}.json").write_text(dump(qs), encoding="utf-8")
    counts = {lv["id"]: sum(len(t["lessons"]) for t in lv["topics"] if t["kind"] == "grammar") for lv in index["levels"]}
    size = sum(f.stat().st_size for f in folder.glob("*.json")) // 1024
    print(f"{code}: grammar lessons {counts}, {len(lessons)} lesson files, {sum(len(v) for qs in questions.values() for v in qs.values())} questions, {size} KB")


if __name__ == "__main__":
    main(sys.argv[1])
