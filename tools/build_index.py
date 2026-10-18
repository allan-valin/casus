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
from casus_build.expand import add_uniques, expand  # noqa: E402
from casus_build.extras import EXTRA_DICTLINE, EXTRA_INDEX_OFFSET  # noqa: E402
from casus_build.uniques import parse_uniques  # noqa: E402
from casus_build.headword import lemma_record  # noqa: E402
from casus_build.inflects import parse_inflects  # noqa: E402
from casus_build.shard import _lemma_int, write_assets  # noqa: E402


def _parse_sparse(lines):
    """parse_dictline over a list with blank gaps, keeping each line's index as its id."""
    from casus_build.dictline import _parse_line
    return [_parse_line(line, i) for i, line in enumerate(lines) if line]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--vendor", default="vendor/whitakers-words", type=Path)
    ap.add_argument("--out", default="data/la", type=Path)
    args = ap.parse_args(argv)

    t0 = time.time()
    lines = (args.vendor / "DICTLINE.GEN").read_text(encoding="latin-1").splitlines()
    # the hand-written entries (sum) sit at EXTRA_INDEX_OFFSET so their ids never collide
    lines = lines + [""] * (EXTRA_INDEX_OFFSET - len(lines)) + EXTRA_DICTLINE
    lemmas = merge_continuations(_parse_sparse(lines))
    rules = parse_inflects((args.vendor / "INFLECTS.LAT").read_text(encoding="latin-1").splitlines())
    uniques_file = args.vendor / "UNIQUES.LAT"
    uniques = parse_uniques(uniques_file.read_text(encoding="latin-1").splitlines()) if uniques_file.exists() else []
    print(f"{len(lemmas)} lemmas, {len(rules)} rules, {len(uniques)} unique forms", flush=True)

    index = expand(lemmas, rules)
    add_uniques(index, uniques)
    print(f"{len(index)} forms, {sum(len(v) for v in index.values())} analyses "
          f"in {time.time() - t0:.0f} s", flush=True)

    # keyed by the integer at the end of Lemma.id — the number the shard rows carry
    records = {str(_lemma_int(l.id)): lemma_record(l, rules) for l in lemmas}
    glosses = {str(_lemma_int(l.id)): l.gloss_en for l in lemmas if l.gloss_en}
    for u in uniques:  # a unique form is its own headword; no rule built it
        key = str(_lemma_int(u.lemma.id))
        records[key] = {k: v for k, v in {"headword": u.form, "dict_form": u.form, "pos": u.lemma.pos,
                        "kind": u.lemma.kind, "age": u.lemma.age, "freq": u.lemma.freq}.items() if v is not None}
        glosses[key] = u.lemma.gloss_en

    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "glosses.en.json").write_text(
        json.dumps(glosses, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest = write_assets(index, records, args.out)
    print(f"{len(manifest['shards'])} shards, {manifest['total_bytes'] / 1e6:.1f} MB of forms+lemmas, "
          f"built in {time.time() - t0:.0f} s")
    biggest = sorted(manifest["shards"].items(), key=lambda kv: -kv[1]["bytes"])[:5]
    for name, s in biggest:
        print(f"  {name}: {s['forms']} forms, {s['bytes'] / 1e6:.1f} MB")
    # the Portuguese layer, when its extract has been fetched (tools/fetch_glosses_pt.sh)
    from build_glosses_pt import DEFAULT_SRC, build as build_pt
    if DEFAULT_SRC.exists():
        n, overall, common = build_pt(DEFAULT_SRC, args.out)
        print(f"glosses.pt.json: {n} records, {overall:.1%} of all, {common:.1%} of the frequent (A–C)")
    else:
        print("no Portuguese extract (vendor/ptwiktionary): glosses.pt.json not built")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
