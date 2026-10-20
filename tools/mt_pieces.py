#!/usr/bin/env python3
"""The sentences of one imported book that need translating, for Claude to translate (Allan, 2026-10-20: the core
course of each language is translated by Claude; the rest by MADLAD). Placeholders [1], [2]… stand for the examples
and must stay in the translation exactly once each.

  python3 tools/mt_pieces.py list <code> --ui pt --source "JLPT Grammar Enhanced" --out pieces.json
      the pieces not yet in tools/mt_fixes, in page order, as a JSON list
  python3 tools/mt_pieces.py import pieces.json translations.txt --ui pt --book jlpt
      translations.txt has lines "<n>|<translation>"; they are added to tools/mt_fixes/<ui>/<book>.yml
then: python3 tools/translate_learn.py <code> --ui pt --cache-only --redo"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from translate_learn import ROOT, pieces_for  # noqa: E402

PH = re.compile(r"\[(\d+)\]")


def import_translations(pieces: list, lines: list) -> dict:
    """{piece: translation} from "<n>|<translation>" lines; a translation must keep every placeholder exactly once"""
    out = {}
    for line in lines:
        if not line.strip():
            continue
        n, text = line.rstrip("\n").split("|", 1)
        src = pieces[int(n)]
        if sorted(PH.findall(src)) != sorted(PH.findall(text)):
            raise ValueError(f"piece {n}: placeholders {PH.findall(src)} != {PH.findall(text)}")
        out[src] = text.strip()
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("list")
    a.add_argument("code")
    a.add_argument("--ui", required=True)
    a.add_argument("--source", required=True)
    a.add_argument("--out", required=True)
    b = sub.add_parser("import")
    b.add_argument("pieces")
    b.add_argument("translations")
    b.add_argument("--ui", required=True)
    b.add_argument("--book", required=True)
    args = ap.parse_args()
    if args.cmd == "list":
        p = pieces_for(args.code, args.ui, args.source)
        Path(args.out).write_text(json.dumps(p, ensure_ascii=False, indent=0), encoding="utf-8")
        print(f"{len(p)} pieces, {sum(map(len, p))} characters → {args.out}")
    else:
        import yaml
        new = import_translations(json.loads(Path(args.pieces).read_text(encoding="utf-8")), Path(args.translations).read_text(encoding="utf-8").splitlines())
        f = ROOT / "tools" / "mt_fixes" / args.ui / f"{args.book}.yml"
        f.parent.mkdir(parents=True, exist_ok=True)
        old = (yaml.safe_load(f.read_text(encoding="utf-8")) or {}) if f.exists() else {}
        old.update(new)
        head = f"# {args.book}: translated into {args.ui} by Claude (Allan, 2026-10-20: core courses by Claude). Read by tools/translate_learn.py.\n"
        f.write_text(head + yaml.safe_dump(old, allow_unicode=True, width=1000, sort_keys=False), encoding="utf-8")
        print(f"{len(new)} added, {len(old)} in {f.relative_to(ROOT)}")
