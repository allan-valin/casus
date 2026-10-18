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
from casus_build.expressions import build_expressions  # noqa: E402

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


def build_de(src: Path, out: Path) -> dict:
    from casus_build.de.codes import CODES_JSON, encode_analysis
    from casus_build.de.parse import ARTICLE, build_index, contraction_entries, parse_entries, phrase_entries
    from casus_build.de.prepositions import GOVERNMENT

    with src.open(encoding="utf-8") as fh:
        entries = list(parse_entries(fh))
    index = build_index(entries)

    def rows(analyses):
        groups: dict[int, list[str]] = {}
        for a in analyses:
            groups.setdefault(a["lemma"], []).append(encode_analysis({k: v for k, v in a.items() if k != "lemma"}))
        return [[lemma, *codes] for lemma, codes in groups.items()]

    lemmas = {}
    for e in [*entries, *contraction_entries()]:
        art = ARTICLE.get(e.get("gender")) if e["pos"] == "noun" else None
        rec = {"headword": e["headword"], "dict_form": f"{art} {e['headword']}" if art else e["headword"],
               "pos": e["pos"], "gender": e.get("gender"), "article": art}
        lemmas[str(e["id"])] = {k: v for k, v in rec.items() if v is not None}
    out.mkdir(parents=True, exist_ok=True)
    manifest = write_assets(index, lemmas, out, rows=rows, key_of=lambda f: f.lower())
    for name, obj in (("glosses.en.json", {str(e["id"]): e["gloss_en"] for e in entries if e["gloss_en"]}),
                      ("ipa.json", {str(e["id"]): e["ipa"] for e in entries if e["ipa"]}),
                      ("government.json", GOVERNMENT), ("codes.json", CODES_JSON),
                      ("compounds.json", _compounds(entries)),
                      ("valency.json", _valency(entries)),
                      ("expressions.json", build_expressions([*phrase_entries(src.open(encoding="utf-8")), *(e for e in entries if e["pos"] == "verb" and " " not in e["headword"])]))):
        (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest["key"] = "lower"
    manifest["expressions"] = True           # shard names come from the lower-cased form
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


def build_ja(src: Path, out: Path) -> dict:
    from casus_build.ja.codes import CODES_JSON, encode_analysis
    from casus_build.ja.parse import build_index, parse_entries

    with src.open(encoding="utf-8") as fh:
        entries = list(parse_entries(fh))
    index = build_index(entries)

    def rows(analyses):
        # [lemma, "~reading"?, codes…]: one row per lemma and reading of this spelling
        groups: dict[tuple, list[str]] = {}
        for a in analyses:
            groups.setdefault((a["lemma"], a.get("reading")), []).append(encode_analysis({k: v for k, v in a.items() if k not in ("lemma", "reading")}))
        return [[lemma, *(["~" + reading] if reading else []), *codes] for (lemma, reading), codes in groups.items()]

    lemmas = {}
    for e in entries:
        rec = {"headword": e["headword"], "dict_form": e["headword"] + (f" ({e['reading']})" if e["reading"] and e["reading"] != e["headword"] else ""),
               "pos": e["pos"], "cls": e["cls"]}
        lemmas[str(e["id"])] = {k: v for k, v in rec.items() if v is not None}
    out.mkdir(parents=True, exist_ok=True)
    # shards by a hash of the first two characters (casus_build/ja/bucket.py): a few hundred files, no long list
    from casus_build.ja.bucket import bucket
    manifest = write_assets(index, lemmas, out, rows=rows, key_of=bucket)
    for name, obj in (("glosses.en.json", {str(e["id"]): e["gloss_en"] for e in entries if e["gloss_en"]}),
                      ("ipa.json", {str(e["id"]): e["ipa"] for e in entries if e["ipa"]}),
                      ("government.json", {}), ("codes.json", CODES_JSON)):
        (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest["key"] = "bucket"
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


def _valency(entries) -> dict:
    from casus_build.de.valency import valency_by_lemma
    return valency_by_lemma({str(e["id"]): {"headword": e["headword"], "pos": e["pos"]} for e in entries})


def _compounds(entries) -> dict:
    """lemma id -> lengths of the headword's roots (Muttersprache -> [6, 7]), German nouns of 7+ letters."""
    from casus_build.de.compounds import split_compound
    nouns = {e["headword"].lower() for e in entries if e["pos"] == "noun" and " " not in e["headword"]}
    other = {e["headword"].lower() for e in entries if e["pos"] in ("adj", "adv", "num") and " " not in e["headword"]}
    other |= {e["headword"].lower()[:-2] for e in entries if e["pos"] == "verb" and e["headword"].endswith("en")}
    out = {}
    for e in entries:
        w = e["headword"]
        if e["pos"] != "noun" or " " in w or "-" in w or len(w) < 7:
            continue
        split = split_compound(w, nouns - {w.lower()}, other)
        if split:
            out[str(e["id"])] = [len(x) for x in split]
    return out


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
    # the dictionary index only: paradigm tables are counted separately (docs/DATA.md, budget ruling)
    raw = sum(p.stat().st_size for p in out.rglob("*") if p.is_file() and "paradigms" not in p.parts)
    sizes = {}
    for p in (out / "forms").glob("*.json"):
        sizes[p.stem] = len(gzip.compress(p.read_bytes(), 6))
    over = {k: v for k, v in sizes.items() if v > BUDGET_SHARD_GZ}
    return {"raw": raw, "gz_all": sum(sizes.values()), "shards": len(sizes), "largest": sorted(sizes.items(), key=lambda kv: -kv[1])[:5], "over": over}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("code", choices=["grc", "de", "ja"])
    ap.add_argument("--vendor", default="vendor/wiktextract", type=Path)
    ap.add_argument("--data", default="data", type=Path)
    ap.add_argument("--drop-dialects", action="store_true", help="keep only Attic, Koine and unlabelled tables")
    args = ap.parse_args(argv)
    out = args.data / args.code
    t0 = time.time()
    if args.code == "grc":
        manifest = build_grc(args.vendor / "kaikki.org-dictionary-AncientGreek.jsonl", out, args.drop_dialects)
    elif args.code == "ja":
        manifest = build_ja(args.vendor / "kaikki.org-dictionary-Japanese.jsonl", out)
    else:
        manifest = build_de(args.vendor / "kaikki.org-dictionary-German.jsonl", out)
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
