"""Conversation ↔ Learn (Allan, 2026-10-27, T1 in docs/conversation/TASKS-2026-10-27.md).

    python3 tools/learn_coverage.py [code …]     # report for each course → docs/conversation/COVERAGE.md

Every lesson a unit names in learn_lessons must exist in that language's Learn (data/<code>/learn.json); a unit theme
Learn has no lesson for goes in learn_missing instead, and is listed, never dropped. The syllabus is each level's core
grammar topics (<level>-tN or <code>-<level>-tN), not the word lists (-w-), a book's chapters (-wb…) or Reference. The
report lists, per level, the lessons the course practises AND the ones it does not. A course whose bible says
in_development: false fails on gaps; dead ids fail always."""
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def _core(topic_id, level, code):
    return re.fullmatch(rf"(?:{re.escape(code)}-)?{re.escape(level)}-t\d+", topic_id) is not None


def syllabus(learn, code):
    """{level: [lesson ids]} — the core grammar topics, in Learn's order"""
    out = {}
    for lv in learn.get("levels") or []:
        ids = [e["id"] for t in lv["topics"] if t.get("kind") == "grammar" and _core(t["id"], lv["id"], code) for e in t["lessons"]]
        if ids:
            out[lv["id"]] = ids
    return out


def _all_lessons(learn):
    return {e["id"] for lv in learn.get("levels") or [] for t in lv["topics"] for e in t["lessons"]}


def coverage(units, learn, code):
    known = _all_lessons(learn)
    used = set()
    dead, no_lesson = [], []
    for u in units:
        for lid in u.get("learn_lessons") or []:
            if lid in known:
                used.add(lid)
            else:
                dead.append((u["id"], lid))
        no_lesson += [(u["id"], x) for x in u.get("learn_missing") or []]
    levels = [{"level": lv, "covered": [x for x in ids if x in used], "missing": [x for x in ids if x not in used]}
              for lv, ids in syllabus(learn, code).items()]
    return {"levels": levels, "dead": dead, "no_lesson": no_lesson}


def coverage_errors(cov, in_development):
    errors = [f"{uid}: learn lesson {lid} does not exist in Learn" for uid, lid in cov["dead"]]
    if not in_development:
        errors += [f"coverage: {lv['level']} lesson {lid} is practised in no unit" for lv in cov["levels"] for lid in lv["missing"]]
    return errors


def _slot(uid):
    return re.sub(r"^([ABC][12]-\d+)-[a-z]+$", r"\1", uid)     # audience versions A1-02-e / -m share a slot


def lessons_by_unit(units):
    """{lesson id: [{unit, level, title}]} for Learn's "practised in Conversation" line; a slot is named once"""
    out = {}
    for u in sorted(units, key=lambda u: (u["level"], u["number"], u["id"])):
        for lid in u.get("learn_lessons") or []:
            slot = _slot(u["id"])
            if all(x["unit"] != slot for x in out.setdefault(lid, [])):
                out[lid].append({"unit": slot, "level": u["level"], "title": u["title"]})
    return out


def load_learn(data, code):
    p = Path(data) / code / "learn.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def _titles(learn):
    return {e["id"]: e.get("title", "") for lv in learn["levels"] for t in lv["topics"] for e in t["lessons"]}


def report(code, units, learn, in_development):
    cov = coverage(units, learn, code)
    title = _titles(learn)
    total = sum(len(lv["covered"]) + len(lv["missing"]) for lv in cov["levels"])
    done = sum(len(lv["covered"]) for lv in cov["levels"])
    lines = [f"## {code} — {done}/{total} grammar lessons practised" + (" (in development)" if in_development else ""), ""]
    lines.append(f"Dead lesson ids: {len(cov['dead'])}. Unit themes Learn has no lesson for: {len(cov['no_lesson'])}.")
    lines.append("")
    for lv in cov["levels"]:
        lines.append(f"### {lv['level']} — {len(lv['covered'])} covered, {len(lv['missing'])} not covered")
        lines.append("")
        lines.append("Covered: " + (", ".join(f"{x} ({title[x]})" for x in lv["covered"]) or "none"))
        lines.append("")
        lines.append("Not covered: " + (", ".join(f"{x} ({title[x]})" for x in lv["missing"]) or "none"))
        lines.append("")
    if cov["dead"]:
        lines += ["### Dead ids", ""] + [f"- {u}: {x}" for u, x in cov["dead"]] + [""]
    if cov["no_lesson"]:
        themes = {}
        for u, x in cov["no_lesson"]:
            themes.setdefault(x, []).append(u)
        lines += ["### Unit themes with no Learn lesson", ""] + [f"- {x}: {', '.join(us)}" for x, us in sorted(themes.items())] + [""]
    return "\n".join(lines), cov


def main(codes):
    src = ROOT / "tools" / "conversation"
    codes = codes or sorted(p.name for p in src.iterdir() if (p / "story-bible.yml").exists() and not p.name.startswith("_"))
    parts, bad = ["# Conversation ↔ Learn coverage", "", "Built by tools/learn_coverage.py. Syllabus = each Learn level's core grammar topics.", ""], False
    for code in codes:
        bible = yaml.safe_load((src / code / "story-bible.yml").read_text(encoding="utf-8"))
        units = [yaml.safe_load(p.read_text(encoding="utf-8")) for p in sorted((src / code).glob("[ABC][12]-*.yml"))]
        learn = load_learn(ROOT / "data", code)
        if not units or learn is None:
            print(f"{code}: {'no units' if not units else 'no Learn data'} — skipped")
            continue
        text, cov = report(code, units, learn, bible.get("in_development", False))
        errors = coverage_errors(cov, bible.get("in_development", False))
        bad |= bool(errors)
        parts.append(text)
        print(text.splitlines()[0][3:], "|", " ".join(f"{lv['level']} {len(lv['covered'])}/{len(lv['covered']) + len(lv['missing'])}" for lv in cov["levels"]), f"| dead {len(cov['dead'])}")
    (ROOT / "docs" / "conversation" / "COVERAGE.md").write_text("\n".join(parts), encoding="utf-8")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
