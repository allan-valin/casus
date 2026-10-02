#!/usr/bin/env python3
"""Build the data/ assets from vendor/whitakers-words.

Usage: python tools/build_index.py [--out data] [--vendor vendor/whitakers-words]
Reads DICTLINE.GEN and INFLECTS.LAT, expands every lemma against every rule
(Tasks 4-6 of the core plan), shards the index by its first two letters and
writes forms/<aa>.json, lemmas.json, glosses.en.json and manifest.json.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from casus_build.dictline import merge_continuations, parse_dictline  # noqa: E402
from casus_build.expand import expand  # noqa: E402
from casus_build.headword import lemma_record  # noqa: E402
from casus_build.inflects import parse_inflects  # noqa: E402
from casus_build.shard import _lemma_int, write_assets  # noqa: E402


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--vendor", default="vendor/whitakers-words", type=Path)
    ap.add_argument("--out", default="data", type=Path)
    args = ap.parse_args(argv)

    t0 = time.time()
    lines = (args.vendor / "DICTLINE.GEN").read_text(encoding="latin-1").splitlines()
    lemmas = merge_continuations(parse_dictline(lines))
    rules = parse_inflects((args.vendor / "INFLECTS.LAT").read_text(encoding="latin-1").splitlines())
    print(f"{len(lemmas)} lemmas, {len(rules)} rules", flush=True)

    index = expand(lemmas, rules)
    print(f"{len(index)} forms, {sum(len(v) for v in index.values())} analyses "
          f"in {time.time() - t0:.0f} s", flush=True)

    # keyed by the integer at the end of Lemma.id — the number the shard rows carry
    records = {str(_lemma_int(l.id)): lemma_record(l, rules) for l in lemmas}
    glosses = {str(_lemma_int(l.id)): l.gloss_en for l in lemmas if l.gloss_en}

    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "glosses.en.json").write_text(
        json.dumps(glosses, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest = write_assets(index, records, args.out)
    print(f"{len(manifest['shards'])} shards, {manifest['total_bytes'] / 1e6:.1f} MB of forms+lemmas, "
          f"built in {time.time() - t0:.0f} s")
    biggest = sorted(manifest["shards"].items(), key=lambda kv: -kv[1]["bytes"])[:5]
    for name, s in biggest:
        print(f"  {name}: {s['forms']} forms, {s['bytes'] / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
