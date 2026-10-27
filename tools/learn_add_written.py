#!/usr/bin/env python3
"""Add or update the lessons written for Casus in a language's built Learn, without rebuilding the rest.

    python3 tools/learn_add_written.py de A1 A2 B1      # then: node tools/learn_curriculum.mjs de <the new ids>
    python3 tools/learn_add_written.py mk A1 A2 --only=a1-x,a2-y   # only new lessons of a level that is built already

Why (2026-10-27): rebuilding German Learn from scratch (tools/build_learn.py de) no longer gives the data that is
published — the Arabic translation cache was renamed, three Wikibooks pages are missing from vendor/ — so new lessons
are spliced into data/<code>/learn.json instead. The written level's topics go after that level's existing core topics
(before the books and word lists); topics and lessons with the same ids are replaced, so a rerun is safe."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_learn import ROOT, attested_words  # noqa: E402
from learn_curriculum import written_levels  # noqa: E402

CORE = re.compile(r"(?:[a-z]+-)?[ABC][12]-t\d+$")


def splice(index, levels, lessons, questions, out):
    folder = out / "learn"
    files = list(index.get("files", []))
    add = lambda f: files.append(f) if f not in files else None   # noqa: E731
    for lv in levels:
        same = next((x for x in index["levels"] if x["id"] == lv["id"]), None)
        if same is None:
            index["levels"].append(lv)
        else:
            new_ids = {t["id"] for t in lv["topics"]}
            mine = {e["id"] for t in lv["topics"] for e in t["lessons"]}
            # drop an earlier copy of these topics, and these lessons wherever they were
            kept = [t for t in same["topics"] if t["id"] not in new_ids]
            for t in kept:
                t["lessons"] = [e for e in t["lessons"] if e["id"] not in mine]
            at = max((k + 1 for k, t in enumerate(kept) if CORE.match(t["id"])), default=0)
            same["topics"] = kept[:at] + lv["topics"] + kept[at:]
        for lid, qs in questions.get(lv["id"], {}).items():
            (folder / f"q-{lid}.json").write_text(json.dumps(qs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            add(f"learn/q-{lid}.json")
    for lid, lesson in lessons.items():
        (folder / f"{lid}.json").write_text(json.dumps(lesson, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        add(f"learn/{lid}.json")
    index["files"] = files


def keep_only(levels, lessons, only, index):
    """only the topics holding these lesson ids; a topic gets the next free <level>-tN of the built index unless one
    with the same English title is there already (a rerun)"""
    keep = set(only)
    out = []
    for lv in levels:
        topics = [t for t in lv["topics"] if any(e["id"] in keep for e in t["lessons"])]
        have = next((x for x in index["levels"] if x["id"] == lv["id"]), {"topics": []})["topics"]
        used = [int(m.group(1)) for t in have if (m := re.match(rf"(?:[a-z]+-)?{lv['id']}-t(\d+)$", t["id"]))]
        nxt = max(used, default=0)
        for t in topics:
            en = t["title"].get("en") if isinstance(t["title"], dict) else t["title"]
            same = next((h for h in have if (h.get("title") or {}).get("en") == en and h["id"] != t["id"]), None)
            if same is None and any(h["id"] == t["id"] and (h.get("title") or {}).get("en") != en for h in have):
                nxt += 1
                t["id"] = f"{lv['id']}-t{nxt}"
            elif same is not None:
                t["id"] = same["id"]
        out.append({**lv, "topics": topics})
    return out, {k: v for k, v in lessons.items() if k in keep}


def main(code, ids):
    out = ROOT / "data" / code
    index = json.loads((out / "learn.json").read_text(encoding="utf-8"))
    only = [x[len("--only="):].split(",") for x in ids if x.startswith("--only=")]
    ids = [x for x in ids if not x.startswith("--only=")]
    levels, lessons, questions = written_levels(ROOT / "tools" / "curricula" / code, ids, (out, attested_words(code), False))
    if only:
        levels, lessons = keep_only(levels, lessons, only[0], index)
        questions = {lv: {k: v for k, v in qs.items() if k in lessons} for lv, qs in questions.items()}
    splice(index, levels, lessons, questions, out)
    (out / "learn.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{code}: {len(lessons)} written lessons in {', '.join(ids)}: {' '.join(lessons)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
