#!/usr/bin/env python3
"""Builds data/<code>/paradigms/<bucket>.json — every form of every lemma, inverted from the built form index
(forms/*.json), so the dictionary overlay can draw the whole declension or conjugation table with the
word's own forms highlighted (Allan, 2026-10-18). Usage: build_paradigms.py la|grc|de"""
from __future__ import annotations

import argparse
import gzip
import json
import sys
from pathlib import Path

BUCKETS = 512


def bucket_of(lemma: int, buckets: int = BUCKETS) -> int:
    return int(lemma) % buckets


def invert(shards: dict[str, dict]) -> dict[int, list[list]]:
    """{shard: {form: [[lemma, code…]…]}} -> {lemma: [[form, code…]…]} (forms in shard/key order)."""
    out: dict[int, list[list]] = {}
    for name in sorted(shards):
        for form, rows in shards[name].items():
            for row in rows:
                if not isinstance(row, list):
                    continue
                lemma, codes = int(row[0]), [c for c in row[1:] if not str(c).startswith("=")]
                out.setdefault(lemma, []).append([form, *codes])
    return out


def front_code(rows: list[list]) -> list[list]:
    """Each form after the first as [length shared with the previous form, the rest] (rosae → [4, "e"])."""
    out, prev = [], None
    for form, *codes in rows:
        if prev is None:
            out.append([form, *codes])
        else:
            n = 0
            while n < min(len(prev), len(form)) and prev[n] == form[n]:
                n += 1
            out.append([n, form[n:], *codes])
        prev = form
    return out


def front_decode(coded: list[list]) -> list[list]:
    out, prev = [], None
    for row in coded:
        if prev is None or not isinstance(row[0], int):
            form, codes = row[0], row[1:]
        else:
            form, codes = prev[: row[0]] + row[1], row[2:]
        out.append([form, *codes])
        prev = form
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("code")
    ap.add_argument("--data", default="data", type=Path)
    args = ap.parse_args(argv)
    root = args.data / args.code
    shards = {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in (root / "forms").glob("*.json")}
    paradigms = invert(shards)
    out = root / "paradigms"
    out.mkdir(exist_ok=True)
    for stale in out.glob("*.json"):
        stale.unlink()
    buckets: dict[int, dict] = {}
    for lemma, rows in paradigms.items():
        rows.sort(key=lambda r: r[0])           # sorted forms share longer beginnings
        buckets.setdefault(bucket_of(lemma), {})[str(lemma)] = front_code(rows)
    raw = gz = biggest = 0
    for b, obj in buckets.items():
        text = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        (out / f"{b}.json").write_text(text, encoding="utf-8")
        size = len(gzip.compress(text.encode("utf-8"), 6))
        raw += len(text.encode("utf-8")); gz += size; biggest = max(biggest, size)
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    manifest["paradigms"] = {"buckets": BUCKETS, "coding": "front"}
    (root / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{args.code}: {len(paradigms)} lemmas in {len(buckets)} files, {raw / 1e6:.1f} MB raw, {gz / 1e6:.1f} MB gz, largest {biggest / 1e3:.0f} KB gz")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
