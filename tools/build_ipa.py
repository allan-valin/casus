#!/usr/bin/env python3
"""Builds data/<code>/ipa.json from the language's Wiktextract extract and data/<code>/lemmas.json,
and prints the coverage (languages plan Task 6). Usage: build_ipa.py la"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from casus_build.ipa import build_ipa, ipa_coverage  # noqa: E402

EXTRACTS = {"la": ("Latin", "la")}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("code", choices=sorted(EXTRACTS))
    ap.add_argument("--vendor", default="vendor/wiktextract", type=Path)
    ap.add_argument("--data", default="data", type=Path)
    args = ap.parse_args(argv)
    name, lang_code = EXTRACTS[args.code]
    src = args.vendor / f"kaikki.org-dictionary-{name.replace(' ', '')}.jsonl"
    if not src.exists():
        print(f"no extract at {src}; run tools/fetch_wiktextract.sh {name}", file=sys.stderr)
        return 1
    out = args.data / args.code
    lemmas = json.loads((out / "lemmas.json").read_text(encoding="utf-8"))
    with src.open(encoding="utf-8") as fh:
        ipa = build_ipa(fh, lemmas, lang_code=lang_code)
    (out / "ipa.json").write_text(json.dumps(ipa, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    common = {k: v for k, v in lemmas.items() if v.get("freq") in ("A", "B", "C")}
    print(f"ipa.json: {len(ipa)} lemma records, {ipa_coverage(ipa, lemmas):.1%} of all, "
          f"{ipa_coverage(ipa, common):.1%} of the frequent (A–C), {(out / 'ipa.json').stat().st_size / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
