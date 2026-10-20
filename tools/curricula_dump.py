#!/usr/bin/env python3
"""Print a curriculum's English text compactly (topic titles, then each lesson's meaning, intro, sections and
mistakes), the source for its translation overlays (tools/curricula/<code>/i18n/<ui>.yml). Usage: curricula_dump.py <code> [level…]"""
import sys
from pathlib import Path

import yaml

folder = Path(__file__).resolve().parent / "curricula" / sys.argv[1]
meta = yaml.safe_load((folder / "meta.yml").read_text(encoding="utf-8"))
want = sys.argv[2:] or meta["level_files"]
en = lambda v: (v.get("en", "") if isinstance(v, dict) else v or "").strip()   # noqa: E731
for lv in want:
    f = folder / f"{lv}.yml"
    if not f.exists():
        continue
    d = yaml.safe_load(f.read_text(encoding="utf-8"))
    for t in d.get("topics") or []:
        print(f"## {en(t['title'])}")
        for l in t["lessons"]:
            print(f"- {l['id']} | {en(l['meaning'])}\n  {en(l.get('intro'))}")
            for s in l.get("sections") or []:
                print(f"  [{s['id']}] {en(s['body'])}")
            for m in l.get("mistakes") or []:
                print(f"  [why] {en(m['why'])}")
