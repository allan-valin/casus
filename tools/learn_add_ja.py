"""Japanese Learn lessons written for Casus (2026-10-27 grammar audit, docs/learn/AUDIT-ja-2026-10-27.md): the points
the JLPT book leaves out, in the book's own Markdown (tools/learn_ja.py reads them), one page in English
(tools/curricula/ja/<level>/<id>.md) and one in Portuguese (<id>.pt.md) with the same sections and examples. The first
line names where the lesson goes: <!-- topic: ja-N5-t7 after: n5-046 -->. Spliced into the built Learn; the other
lessons are not touched (a full rebuild is not reproducible any more, see docs/conversation/HANDOFF-2026-10-27.md).
Written by AI (Claude), marked as such on every lesson.

    python3 tools/learn_add_ja.py            # every page in tools/curricula/ja; then
    node tools/learn_examples.mjs ja --only=<ids>   # romaji, words and Tatoeba exercises for those lessons only
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_learn import _gap  # noqa: E402
from learn_ja import parse_page  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
WHERE = re.compile(r"^<!--\s*topic:\s*(\S+)\s+after:\s*(\S+)\s*-->\s*\n", re.M)
SOURCE = "written for Casus"


def lesson_of(lid: str, level: str, en: str, pt: str) -> tuple[dict, tuple[str, str]]:
    m = WHERE.search(en)
    where = (m.group(1), m.group(2))
    en, pt = WHERE.sub("", en), WHERE.sub("", pt)
    # the parser knows its sections by their English headings: the Portuguese page is read under the English ones
    heads = re.compile(r"^## (.+)$", re.M)
    en_heads, pt_heads = heads.findall(en), heads.findall(pt)
    names = iter(en_heads)
    a, b = parse_page(en), parse_page(heads.sub(lambda m: f"## {next(names)}", pt))
    both = lambda x, y: {"en": x, "pt": y}   # noqa: E731
    sections = [{"id": s["id"], "title": both(s["title"], p), "html": both(s["html"], t["html"])}
                for s, t, p in zip(a["sections"], b["sections"], pt_heads)]
    examples = [{**x, "pt": y["en"]} for x, y in zip(a["examples"], b["examples"])]
    lesson = {"id": lid, "title": a["title"], "meaning": both(a["meaning"], b["meaning"]), "intro": both(a["intro"], b["intro"]),
              "sections": sections, "examples": examples, "practice": a["practice"], "level": level, "source": SOURCE, "ai": True}
    return lesson, where


def place(index: dict, lesson: dict, where: tuple[str, str]) -> None:
    topic_id, after = where
    level = next(lv for lv in index["levels"] if lv["id"] == lesson["level"])
    topic = next(t for t in level["topics"] if t["id"] == topic_id)
    for t in level["topics"]:
        t["lessons"] = [e for e in t["lessons"] if e["id"] != lesson["id"]]
    at = next(k for k, e in enumerate(topic["lessons"]) if e["id"] == after) + 1
    topic["lessons"].insert(at, {"id": lesson["id"], "title": lesson["title"], "meaning": lesson["meaning"]["en"]})
    files = index.setdefault("files", [])
    for f in (f"learn/{lesson['id']}.json", f"learn/q-{lesson['id']}.json"):
        if f not in files:
            files.append(f)


def questions_of(lesson: dict, pool: list) -> dict:
    """the book lessons' questions (tools/build_learn.py ja_learn): a gap and a translation per example, the meaning"""
    qs = []
    for ex in lesson["examples"]:
        gap = _gap(ex["furi"], ex["target"]) if ex["target"] else None
        if gap:
            qs.append({"type": "gap", "furi": gap, "en": ex["en"], "answer": ex["target"]})
        qs.append({"type": "translate", "furi": ex["furi"], "kana": ex["kana"], "answer": ex["en"]})
    qs.append({"type": "meaning", "prompt": lesson["title"], "answer": lesson["meaning"]["en"], "pool": []})
    return {"pools": {"gap": pool}, "qs": qs}


def main() -> None:
    data = ROOT / "data" / "ja"
    index = json.loads((data / "learn.json").read_text(encoding="utf-8"))
    for en_file in sorted((ROOT / "tools" / "curricula" / "ja").glob("n*/*.md")):
        if en_file.name.endswith(".pt.md"):
            continue
        lid, level = en_file.stem, en_file.parent.name.upper()
        lesson, where = lesson_of(lid, level, en_file.read_text(encoding="utf-8"),
                                  en_file.with_name(f"{lid}.pt.md").read_text(encoding="utf-8"))
        lesson["topic"] = json.loads((data / "learn" / f"{where[1]}.json").read_text(encoding="utf-8"))["topic"]
        place(index, lesson, where)
        # the meaning question's wrong answers: the other lessons of the topic
        topic = next(t for lv in index["levels"] for t in lv["topics"] if t["id"] == where[0])
        q = questions_of(lesson, [ex["target"] for ex in lesson["examples"] if ex["target"]])
        q["qs"][-1]["pool"] = [e["meaning"] for e in topic["lessons"] if e["id"] != lid and isinstance(e.get("meaning"), str)]
        (data / "learn" / f"{lid}.json").write_text(json.dumps(lesson, ensure_ascii=False), encoding="utf-8")
        (data / "learn" / f"q-{lid}.json").write_text(json.dumps(q, ensure_ascii=False), encoding="utf-8")
        print(lid, "→", *where)
    (data / "learn.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
