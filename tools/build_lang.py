#!/usr/bin/env python3
"""Builds data/<code>/ for a Wiktextract-sourced language (languages plan Task 11). Usage: build_lang.py grc

Writes forms/ (shards named by the prefix of the form without diacritics), lemmas.json, glosses.en.json,
ipa.json, government.json, codes.json and manifest.json; prints the size gate (≤ 60 MB raw, every shard
≤ 300 KB gzipped) and the largest shards.
"""
from __future__ import annotations

import argparse
import gzip
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from casus_build.shard import write_assets  # noqa: E402

BUDGET_RAW = 60e6
BUDGET_SHARD_GZ = 300e3


def build_grc(src: Path, out: Path, drop_dialects: bool) -> dict:
    from casus_build.grc.codes import CODES_JSON, encode_analysis
    from casus_build.grc.normalize import strip_grc
    from casus_build.grc.parse import build_index, parse_entries
    from casus_build.grc.prepositions import GOVERNMENT

    with src.open(encoding="utf-8") as fh:
        entries = list(parse_entries(fh))
    if drop_dialects:
        for e in entries:
            e["forms"] = _attic_koine_only(e["forms"])
    index = build_index(entries)

    def rows(analyses):
        groups: dict[tuple, list[str]] = {}
        for a in analyses:
            groups.setdefault((a["lemma"], a.get("marked")), []).append(
                encode_analysis({k: v for k, v in a.items() if k not in ("lemma", "marked")}))
        return [[lemma, *(["=" + marked] if marked else []), *codes] for (lemma, marked), codes in groups.items()]

    lemmas = {}
    for e in entries:
        rec = {"headword": e["headword"], "dict_form": _dict_form(e), "pos": e["pos"], "gender": e["gender"], "decl": e["decl"]}
        lemmas[str(e["id"])] = {k: v for k, v in rec.items() if v is not None}
    out.mkdir(parents=True, exist_ok=True)
    manifest = write_assets(index, lemmas, out, rows=rows, key_of=strip_grc)
    for name, obj in (("glosses.en.json", {str(e["id"]): e["gloss_en"] for e in entries if e["gloss_en"]}),
                      ("ipa.json", {str(e["id"]): e["ipa"] for e in entries if e["ipa"]}),
                      ("government.json", GOVERNMENT), ("codes.json", CODES_JSON)):
        (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest["key"] = "strip"           # the page computes shard names from the stripped form
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


_DIALECTS = ("Epic", "Ionic", "Doric", "Aeolic", "Laconian", "Boeotian", "Cretan", "Arcadocypriot", "Cypriot",
             "Thessalian", "Lesbian", "Elean")


def _attic_koine_only(forms):
    """Drop the cells of dialect tables (Epic aorist, Ionic present…), keeping Attic, Koine and unlabelled."""
    out, keep = [], True
    for f in forms:
        if "table-tags" in (f.get("tags") or []):
            keep = not any(d in f.get("form", "") for d in _DIALECTS)
        if keep:
            out.append(f)
    return out


def _dict_form(e: dict) -> str:
    import unicodedata
    plain = lambda w: unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", w) if c not in "\u0304\u0306"))
    gen = next((plain(f["form"]) for f in e["forms"] if (f.get("tags") or []) == ["genitive"] and not f.get("source")), None)
    if e["pos"] == "noun" and gen:
        return f"{e['headword']}, {gen}" + (f" {e['gender']}." if e.get("gender") else "")
    return e["headword"]


def measure(out: Path) -> dict:
    raw = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    sizes = {}
    for p in (out / "forms").glob("*.json"):
        sizes[p.stem] = len(gzip.compress(p.read_bytes(), 6))
    over = {k: v for k, v in sizes.items() if v > BUDGET_SHARD_GZ}
    return {"raw": raw, "gz_all": sum(sizes.values()), "shards": len(sizes), "largest": sorted(sizes.items(), key=lambda kv: -kv[1])[:5], "over": over}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("code", choices=["grc"])
    ap.add_argument("--vendor", default="vendor/wiktextract", type=Path)
    ap.add_argument("--data", default="data", type=Path)
    ap.add_argument("--drop-dialects", action="store_true", help="keep only Attic, Koine and unlabelled tables")
    args = ap.parse_args(argv)
    src = args.vendor / "kaikki.org-dictionary-AncientGreek.jsonl"
    out = args.data / args.code
    t0 = time.time()
    manifest = build_grc(src, out, args.drop_dialects)
    m = measure(out)
    print(f"{manifest['lemmas']} lemmas, {manifest['forms']} forms, {manifest['analyses']} analyses in {time.time() - t0:.0f} s")
    print(f"raw {m['raw'] / 1e6:.1f} MB (budget {BUDGET_RAW / 1e6:.0f}), all shards gz {m['gz_all'] / 1e6:.1f} MB, "
          f"{m['shards']} shards, over 300 KB gz: {len(m['over'])}")
    for name, size in m["largest"]:
        print(f"  {name}: {size / 1e3:.0f} KB gz")
    ok = m["raw"] <= BUDGET_RAW and not m["over"]
    print("gate:", "PASS" if ok else "FAIL")
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
