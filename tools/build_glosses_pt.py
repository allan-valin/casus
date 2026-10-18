#!/usr/bin/env python3
"""Builds data/glosses.pt.json from the Portuguese Wiktionary extract (tools/fetch_glosses_pt.sh)
and data/lemmas.json, and prints the coverage (core plan Task 8, spec §12 question 3).
Run after tools/build_index.py; build_index.py also calls this when the extract is present."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from casus_build.glosses import build_pt_glosses, gloss_coverage  # noqa: E402

DEFAULT_SRC = Path("vendor/ptwiktionary/kaikki.org-dictionary-Latim.jsonl")


def build(src: Path, out: Path) -> tuple[int, float, float]:
    records = json.loads((out / "lemmas.json").read_text(encoding="utf-8"))
    with src.open(encoding="utf-8") as fh:
        glosses = build_pt_glosses(fh, records)
    (out / "glosses.pt.json").write_text(
        json.dumps(glosses, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    overall, common = gloss_coverage(glosses, records)
    return len(glosses), overall, common


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--src", default=DEFAULT_SRC, type=Path)
    ap.add_argument("--out", default="data", type=Path)
    args = ap.parse_args(argv)
    if not args.src.exists():
        print(f"no Portuguese extract at {args.src}; run tools/fetch_glosses_pt.sh", file=sys.stderr)
        return 1
    n, overall, common = build(args.src, args.out)
    print(f"glosses.pt.json: {n} lemma records glossed — {overall:.1%} of all records, "
          f"{common:.1%} of the frequent ones (Whitaker freq A–C)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
