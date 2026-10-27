"""Build Conversation practice courses for the Talk tab.

    python3 tools/build_conversation.py            # tools/conversation/* → public/talk/<code>.json

Each folder with a story bible and units is checked first (tools/conversation_check.py); a course with errors is
not built. The writers' template (_template) is built as an example course for its language, unless a real course
for that language exists."""
import json
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from conversation_check import check_bible, check_course, check_unit  # noqa: E402
from ja_text import kanji_lessons, rich_course, unit_kanji  # noqa: E402
from learn_coverage import coverage, coverage_errors, lessons_by_unit, load_learn  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]


def _load(p):
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def build(src=ROOT / "tools" / "conversation", out=ROOT / "public" / "talk", learn=ROOT / "data"):
    courses = {}
    for folder in sorted(p for p in Path(src).iterdir() if (p / "story-bible.yml").exists()):
        bible = _load(folder / "story-bible.yml")
        units = [_load(p) for p in sorted(folder.glob("[ABC][12]-*.yml"))]
        if not units:
            continue
        errors, warnings = check_bible(bible), []
        if not errors:
            for u in units:
                e, w = check_unit(u, bible)
                errors += e
                warnings += w
            errors += check_course(units, bible)
            # every lesson a unit names exists in Learn; a finished course practises them all (Allan, 2026-10-27)
            L = load_learn(learn, bible["language"])
            if L is None:
                warnings.append(f"Learn not checked: no {bible['language']}/learn.json under {learn}")
            else:
                errors += coverage_errors(coverage(units, L, bible["language"]), bible.get("in_development", False))
        example = folder.name == "_template"
        code = bible["language"]
        if code in courses and example:
            continue
        courses[code] = {"errors": errors, "warnings": warnings, "example": example, "bible": bible, "units": units}
    report = {}
    for code, c in courses.items():
        report[code] = {"errors": c["errors"], "warnings": c["warnings"], "units": len(c["units"])}
        if c["errors"] or c["example"]:          # the template is checked, never published (Allan, 2026-10-21)
            continue
        b = c["bible"]
        data = {
            "language": code, "example": c["example"], "in_development": bool(b.get("in_development")),
            "narrator_languages": b["narrator_languages"],
            "cast": {m["id"]: {"name": m["name"], "voice": m["voice"], "register": m["register"]} for m in b["cast"]},
            "voices": b["voices"], "protagonist": b["protagonist"]["forms"],
            "items": [i for u in c["units"] for i in u["new_items"]],
            "units": c["units"],
        }
        if code == "ja":                         # furigana, romaji and the kana the voice reads (Allan, 2026-10-22)
            try:
                rich_course(data)
                unit_kanji(data, kanji_lessons(ROOT / 'data' / 'ja' / 'learn'))
                # the natural voice's sounds with pitch accent, computed here once (tools/ja_phonemes.py)
                try:
                    from ja_phonemes import phonemes
                except ImportError:
                    report[code]["errors"].append("Japanese needs pyopenjtalk: uvx --with pyyaml --with pyopenjtalk python3 tools/build_conversation.py")
                    continue
                for text, r in data["readings"].items():
                    r["ph"] = phonemes(text, r["say"])
            except ValueError as e:
                report[code]["errors"].append(str(e))
                continue
        Path(out).mkdir(parents=True, exist_ok=True)
        # Learn's "practised in Conversation" line reads this small file, not the whole course
        (Path(out) / "lessons").mkdir(exist_ok=True)
        (Path(out) / "lessons" / f"{code}.json").write_text(json.dumps(lessons_by_unit(c["units"]), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        (Path(out) / f"{code}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return report


if __name__ == "__main__":
    rep = build()
    bad = False
    for code, r in rep.items():
        print(f"{code}: {r['units']} units, {len(r['errors'])} errors, {len(r['warnings'])} warnings")
        for e in r["errors"]:
            print("  ERROR:", e)
            bad = True
    sys.exit(1 if bad else 0)
