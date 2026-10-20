"""Automatic checks of machine-translated Learn pages (Allan, 2026-10-20: translations proofread for meaning; two
languages on every page). A section is flagged when an example of the taught language (an inline element) is lost
or changed, when prose is still in the original's language, when the model loops, or when the length is far from
the original's. Flagged sections and a sample of the rest are what gets read by eye.

usage: python3 tools/mt_check.py <code> --ui pt [--sample N]   (prints a report; writes data/<code>/mt-check.<ui>.json)"""
from __future__ import annotations

import argparse
import json
import random
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mt_html import INLINE, SRC_SCRIPT, TRANSPARENT, is_prose  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
# examples: inline elements the translation must keep as they are (a link or plain span is prose, unless it has lang=)
INLINE_RE = re.compile(r"<(" + "|".join(sorted(INLINE - TRANSPARENT)) + r")\b[^>]*>.*?</\1>|<(?:" + "|".join(sorted(TRANSPARENT)) + r")\b[^>]*\blang=[^>]*>.*?</(?:"
                       + "|".join(sorted(TRANSPARENT)) + r")>", re.S)


def _text(h: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h)).strip()


def problems(orig: str, out: str, src: str) -> list:
    found = []
    lost = Counter(m.group(0) for m in INLINE_RE.finditer(orig)) - Counter(m.group(0) for m in INLINE_RE.finditer(out))
    found += [f"example lost: {x}" for x in lost]
    own = SRC_SCRIPT.get(src)
    if own:
        foreign = re.compile(rf"(?:(?![{own}])[^\W\d_])+")
        gone = Counter(foreign.findall(_text(orig))) - Counter(foreign.findall(_text(out)))
        found += [f"script text changed: {w}" for w in gone]
    for para in re.findall(r"<(?:p|li|td|h\d)\b[^>]*>(.*?)</(?:p|li|td|h\d)>", out, re.S):
        plain = _text(INLINE_RE.sub(" ", para))
        if len(plain) > 10 and is_prose(plain, src) and plain in _text(INLINE_RE.sub(" ", orig)):
            found.append(f"untranslated: {plain[:80]}")
    for m in re.finditer(r'<div class="ex">\s*<p class="ja"[^>]*>(.*?)</p>\s*</div>', out, re.S):
        found.append(f"example without meaning: {_text(m.group(1))[:60]}")
    def top(h):
        words = _text(h).split()
        grams = Counter(tuple(words[k:k + 3]) for k in range(len(words) - 2))
        return grams.most_common(1)[0] if grams else ((), 0)
    (gram, n), (_, n0) = top(out), top(orig)
    if n >= 5 and n > 2 * n0 + 2:          # a loop of the model, not a pattern the original repeats too
        found.append(f"repetition: {' '.join(gram)}")
    a, b = len(_text(orig)), len(_text(out))
    if a > 60 and not 0.6 <= b / a <= 1.8:
        found.append(f"length {b}/{a}")
    return found


def check_language(code: str, ui: str, sample: int = 20, seed: int = 1) -> dict:
    flagged, clean = [], []
    for f in sorted((ROOT / "data" / code / "learn").glob("*.json")):
        if f.name.startswith("q-"):
            continue
        page = json.loads(f.read_text(encoding="utf-8"))
        if not (page.get("mt") or {}).get(ui):
            continue
        for s in [{"id": "intro", "html": page.get("intro")}] + page.get("sections", []):
            h = s.get("html")
            if not isinstance(h, dict) or not h.get(ui):
                continue
            orig = h.get("orig", h.get("en"))
            if h[ui] == orig:
                continue
            item = {"page": f.stem, "section": s.get("id"), "source": page.get("source", "")[:60]}
            # an imported page's intro is Casus's own English credit line, whatever the book's language
            p = problems(orig, h[ui], "en" if s.get("id") == "intro" else page.get("src", "en"))
            (flagged if p else clean).append({**item, "problems": p} if p else item)
    random.Random(seed).shuffle(clean)
    report = {"code": code, "ui": ui, "flagged": flagged, "sample": clean[:sample], "checked": len(flagged) + len(clean)}
    (ROOT / "data" / code / f"mt-check.{ui}.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    return report


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("code")
    ap.add_argument("--ui", required=True)
    ap.add_argument("--sample", type=int, default=20)
    a = ap.parse_args()
    r = check_language(a.code, a.ui, a.sample)
    kinds = Counter(p.split(":")[0].split(" ")[0] for x in r["flagged"] for p in x["problems"])
    print(f"{a.code}>{a.ui}: {r['checked']} sections, {len(r['flagged'])} flagged {dict(kinds)}")
