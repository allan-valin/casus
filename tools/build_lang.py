#!/usr/bin/env python3
"""Builds data/<code>/ for a Wiktextract-sourced language (languages plan Task 11). Usage: build_lang.py grc

Writes forms/ (shards named by the prefix of the form without diacritics), lemmas.json, glosses.en.json,
ipa.json, government.json, codes.json and manifest.json; prints the size gate (≤ 60 MB raw, every shard
≤ 300 KB gzipped) and the largest shards.
"""
from __future__ import annotations

import argparse
import sys as _sys
_sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from casus_build.dump import open_dump
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

    with open_dump(src) as fh:
        entries = list(parse_entries(fh))
    if drop_dialects:
        for e in entries:
            e["forms"] = _attic_koine_only(e["forms"])
    index = build_index(entries)
    entries = used_entries(entries, index)

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

    with open_dump(src) as fh:
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
                      ("expressions.json", build_expressions([*phrase_entries(open_dump(src)), *(e for e in entries if e["pos"] == "verb" and " " not in e["headword"])]))):
        (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest["key"] = "lower"
    manifest["expressions"] = True           # shard names come from the lower-cased form
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


def build_ar(src: Path, out: Path, freq: Path) -> dict:
    """Arabic: nouns, adjectives and closed classes in full; verbs only when one of their forms is among the 50,000
    commonest subtitle words (FrequencyWords, CC BY-SA 4.0), else Wiktionary's 49,000 verbs would not fit the budget."""
    from casus_build.ar.codes import CODES_JSON, encode_analysis
    from casus_build.ar.normalize import strip_ar
    from casus_build.ar.parse import build_index, parse_entries

    common = {strip_ar(l.split()[0]) for l in freq.read_text(encoding="utf-8").splitlines() if l.strip()}
    with open_dump(src) as fh:
        entries = [e for e in parse_entries(fh)
                   if e["pos"] != "verb" or any(strip_ar(t) in common for t, _a in e["cells"]) or strip_ar(e["headword"]) in common]
    index = build_index(entries)

    def rows(analyses):
        groups: dict[int, list[str]] = {}
        for a in analyses:
            groups.setdefault(a["lemma"], []).append(encode_analysis({k: v for k, v in a.items() if k != "lemma"}))
        return [[lemma, *codes] for lemma, codes in groups.items()]

    lemmas = {}
    for e in entries:
        dict_form = e["headword"] + (f", pl. {e['plural']}" if e.get("plural") else "") + (f" ({e['gender']}.)" if e.get("gender") and e["pos"] == "noun" else "") \
            + (f" (form {e['verb_form']})" if e.get("verb_form") else "")
        rec = {"headword": e["headword"], "dict_form": dict_form, "pos": e["pos"], "gender": e.get("gender")}
        lemmas[str(e["id"])] = {k: v for k, v in rec.items() if v is not None}
    out.mkdir(parents=True, exist_ok=True)
    manifest = write_assets(index, lemmas, out, rows=rows, key_of=strip_ar)
    for name, obj in (("glosses.en.json", {str(e["id"]): e["gloss_en"] for e in entries if e["gloss_en"]}),
                      ("ipa.json", {str(e["id"]): e["ipa"] for e in entries if e["ipa"]}),
                      ("government.json", {}), ("codes.json", CODES_JSON)):
        (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest["key"] = "strip"
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


def build_ru(src: Path, out: Path, freq: Path) -> dict:
    """Russian: open classes only when one of their forms is among the 50,000 commonest subtitle words
    (FrequencyWords, CC BY-SA 4.0) — Wiktionary has 214,000 nouns and 198,000 verbs; closed classes in full."""
    from casus_build.ru.codes import CODES_JSON, encode_analysis
    from casus_build.ru.normalize import strip_ru
    from casus_build.ru.parse import build_index, parse_entries, tidy

    common = {strip_ru(l.split()[0]) for l in freq.read_text(encoding="utf-8").splitlines() if l.strip()}
    with open_dump(src) as fh:
        entries = tidy([e for e in parse_entries(fh)
                        if e["pos"] not in ("noun", "verb", "adj", "adv") or strip_ru(e["headword"]) in common
                        or any(strip_ru(t) in common for t, _a in e["cells"])])
    index = build_index(entries)

    def rows(analyses):
        groups: dict[int, list[str]] = {}
        for a in analyses:
            groups.setdefault(a["lemma"], []).append(encode_analysis({k: v for k, v in a.items() if k != "lemma"}))
        return [[lemma, *codes] for lemma, codes in groups.items()]

    lemmas = {}
    for e in entries:
        dict_form = e["headword"] + (f" ({e['gender']}.)" if e.get("gender") and e["pos"] == "noun" else "") \
            + (f" ({'pf.' if e['aspect'] == 'pf' else 'impf.'}" + (f"; {'impf.' if e['aspect'] == 'pf' else 'pf.'} {e['partner']}" if e.get("partner") else "") + ")" if e.get("aspect") else "")
        rec = {"headword": e["headword"], "dict_form": dict_form, "pos": e["pos"], "gender": e.get("gender")}
        lemmas[str(e["id"])] = {k: v for k, v in rec.items() if v is not None}
    out.mkdir(parents=True, exist_ok=True)
    manifest = write_assets(index, lemmas, out, rows=rows, key_of=strip_ru)
    for name, obj in (("glosses.en.json", {str(e["id"]): e["gloss_en"] for e in entries if e["gloss_en"]}),
                      ("ipa.json", {str(e["id"]): e["ipa"] for e in entries if e["ipa"]}),
                      ("government.json", {}), ("codes.json", CODES_JSON)):
        (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest["key"] = "strip"
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


def build_ko(src: Path, out: Path) -> dict:
    """Korean: Wiktionary's nouns, verbs and adjectives with their conjugations, plus the particles (casus_build/ko)."""
    from casus_build.ja.bucket import bucket
    from casus_build.ko.codes import CODES_JSON, encode_analysis
    from casus_build.ko.parse import build_index, parse_entries, particle_entries

    with open_dump(src) as fh:
        entries = list(parse_entries(fh))
    from casus_build.ko.conj import add_conjugations
    entries = add_conjugations(entries, start_id=max(e["id"] for e in entries) + 1)   # connectives, -는/-(으)ㄴ/-(으)ㄹ, 괴로워하다
    entries += particle_entries(10_000_000)
    index = build_index(entries)

    def rows(analyses):
        groups: dict[int, list[str]] = {}
        for a in analyses:
            groups.setdefault(a["lemma"], []).append(encode_analysis({k: v for k, v in a.items() if k != "lemma"}))
        return [[lemma, *codes] for lemma, codes in groups.items()]

    lemmas = {}
    for e in entries:
        rec = {"headword": e["headword"], "dict_form": e["headword"] + (f" ({e['hanja']})" if e.get("hanja") else ""), "pos": e["pos"], "role": e.get("role")}
        lemmas[str(e["id"])] = {k: v for k, v in rec.items() if v is not None}
    out.mkdir(parents=True, exist_ok=True)
    manifest = write_assets(index, lemmas, out, rows=rows, key_of=bucket)       # the Japanese buckets: no spaces to cut by
    for name, obj in (("glosses.en.json", {str(e["id"]): e["gloss_en"] for e in entries if e["gloss_en"]}),
                      ("ipa.json", {str(e["id"]): e["ipa"] for e in entries if e["ipa"]}),
                      ("government.json", {}), ("codes.json", CODES_JSON)):
        (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest["key"] = "bucket"
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


def build_zh(src: Path, out: Path) -> dict:
    """Chinese (Mandarin): Wiktionary's words and characters, keyed by both spellings, pinyin as each row's reading."""
    from casus_build.ja.bucket import bucket
    from casus_build.zh.codes import CODES_JSON, encode_analysis
    from casus_build.zh.parse import build_index, parse_entries

    from casus_build.zh.parse import char_map
    with open_dump(src) as fh:
        entries = list(parse_entries(fh))
    simp = char_map(entries)
    for e in entries:                                  # 書 → 书: single characters get their simplified key
        if len(e["headword"]) == 1 and not e.get("simplified") and e["headword"] in simp:
            e["simplified"] = simp[e["headword"]]
    # CC-CEDICT fills the words and readings Wiktionary lacks; Unihan orders a character's readings (Allan, 2026-10-19)
    from casus_build.zh.cedict import missing_entries, order_rows, parse_cedict, reading_order
    import gzip
    cedict_path, unihan_path = Path("vendor/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz"), Path("vendor/unihan/Unihan_Readings.txt.gz")
    if cedict_path.exists():
        with gzip.open(cedict_path, "rt", encoding="utf-8") as fh:
            frequent = {l.split()[0] for l in Path("vendor/wordlists/zh/zh_cn_50k.txt").read_text(encoding="utf-8").splitlines()[:30000] if l.split()} \
                if Path("vendor/wordlists/zh/zh_cn_50k.txt").exists() else set()
            added = missing_entries(entries, parse_cedict(fh), start_id=max(e["id"] for e in entries) + 1, frequent=frequent)
        print(f"CC-CEDICT: {len(added)} words or readings added")
        entries += added
    index = build_index(entries)
    if unihan_path.exists():
        with gzip.open(unihan_path, "rt", encoding="utf-8") as fh:
            index = order_rows(index, reading_order(fh))
    # word frequencies (FrequencyWords zh_cn, CC BY-SA 4.0): ties in word splitting go to the commoner words
    freq_path = Path("vendor/wordlists/zh/zh_cn_50k.txt")
    if freq_path.exists():
        ranks = {}
        for k, line in enumerate(freq_path.read_text(encoding="utf-8").splitlines()):
            w = line.split()[0] if line.split() else ""
            if w and w not in ranks:
                ranks[w] = k + 1
        (out / "wordfreq.json").parent.mkdir(parents=True, exist_ok=True)
        (out / "wordfreq.json").write_text(json.dumps(ranks, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    def rows(analyses):
        groups: dict[tuple, list[str]] = {}
        for a in analyses:
            groups.setdefault((a["lemma"], a.get("reading")), []).append(encode_analysis(a))
        return [[lemma, *(["~" + r] if r else []), *codes] for (lemma, r), codes in groups.items()]

    lemmas = {}
    for e in entries:
        simp = e.get("simplified")
        shown = f"{simp} ({e['headword']})" if simp and simp != e["headword"] else e["headword"]
        rec = {"headword": simp or e["headword"], "dict_form": shown + (f" {e['pinyin']}" if e.get("pinyin") else ""), "pos": e["pos"]}
        lemmas[str(e["id"])] = rec
    out.mkdir(parents=True, exist_ok=True)
    manifest = write_assets(index, lemmas, out, rows=rows, key_of=bucket)
    for name, obj in (("glosses.en.json", {str(e["id"]): e["gloss_en"] for e in entries if e["gloss_en"]}),
                      ("ipa.json", {str(e["id"]): e["ipa"] for e in entries if e["ipa"]}),
                      ("government.json", {}), ("codes.json", CODES_JSON)):
        (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest["key"] = "bucket"
    manifest["files"] = ["wordfreq.json"]          # the page fetches only the files the manifest names
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


def build_mk(src: Path, out: Path) -> dict:
    """Macedonian: Wiktionary's nouns, adjectives and verbs with their forms (casus_build/mk)."""
    from casus_build.mk.codes import CODES_JSON, encode_analysis
    from casus_build.mk.parse import build_index, parse_entries

    with open_dump(src) as fh:
        entries = list(parse_entries(fh))
    index = build_index(entries)

    def rows(analyses):
        groups: dict[int, list[str]] = {}
        for a in analyses:
            groups.setdefault(a["lemma"], []).append(encode_analysis({k: v for k, v in a.items() if k != "lemma"}))
        return [[lemma, *codes] for lemma, codes in groups.items()]

    lemmas = {}
    for e in entries:
        dict_form = e["headword"] + (f" ({e['gender']}.)" if e.get("gender") and e["pos"] == "noun" else "") + (f" ({e['aspect']}.)" if e.get("aspect") else "")
        rec = {"headword": e["headword"], "dict_form": dict_form, "pos": e["pos"], "gender": e.get("gender")}
        lemmas[str(e["id"])] = {k: v for k, v in rec.items() if v is not None}
    out.mkdir(parents=True, exist_ok=True)
    manifest = write_assets(index, lemmas, out, rows=rows, key_of=lambda f: f.lower())
    for name, obj in (("glosses.en.json", {str(e["id"]): e["gloss_en"] for e in entries if e["gloss_en"]}),
                      ("ipa.json", {str(e["id"]): e["ipa"] for e in entries if e["ipa"]}),
                      ("government.json", {}), ("codes.json", CODES_JSON)):
        (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest["key"] = "lower"
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


def build_generic(code: str, src: Path, out: Path) -> dict:
    """a case language from tools/casus_build/generic.py (Finnish and the others after Macedonian); the dump is
    already filtered to common words at download (tools/fetch_filtered.py)."""
    from casus_build.generic import CONFIGS, build_index, codes, parse_entries, used_entries

    cfg = CONFIGS[code]
    encode, _decode, codes_json = codes(cfg)
    with open_dump(src) as fh:
        entries = list(parse_entries(cfg, fh))
    bin_zip = Path("vendor/bin/SHsnid.csv.zip")
    if code == "is" and bin_zip.exists():
        # BÍN (CC BY-SA 4.0) gives every Icelandic form; Wiktionary gives verbs their principal parts only (Allan, 2026-10-19)
        from casus_build.is_bin import merge_bin, read_bin
        freq = Path("vendor/wordlists/is/is_50k.txt")
        frequent = {l.split()[0].lower() for l in freq.read_text(encoding="utf-8").splitlines() if l.split()} if freq.exists() else set()
        before = len(entries)
        entries = merge_bin(entries, lambda: read_bin(bin_zip), frequent, start_id=max(e["id"] for e in entries) + 1)
        print(f"BÍN: forms merged, {len(entries) - before} frequent lemmas added")
    index = build_index(entries)

    def rows(analyses):
        groups: dict[int, list[str]] = {}
        for a in analyses:
            groups.setdefault(a["lemma"], []).append(encode({k: v for k, v in a.items() if k != "lemma"}))
        return [[lemma, *cs] for lemma, cs in groups.items()]

    lemmas = {str(e["id"]): {k: v for k, v in {"headword": e["headword"], "dict_form": e["headword"] + (f" ({e['gender']}.)" if e.get("gender") and e["pos"] == "noun" else ""),
                                                 "pos": e["pos"], "gender": e.get("gender")}.items() if v is not None} for e in entries}
    out.mkdir(parents=True, exist_ok=True)
    manifest = write_assets(index, lemmas, out, rows=rows, key_of=cfg.key)
    for name, obj in (("glosses.en.json", {str(e["id"]): e["gloss_en"] for e in entries if e["gloss_en"]}),
                      ("ipa.json", {str(e["id"]): e["ipa"] for e in entries if e["ipa"]}),
                      ("government.json", {}), ("codes.json", codes_json)):
        (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest["key"] = "lower" if cfg.key.__name__ == "_lower" else "strip"
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


def build_ja(src: Path, out: Path) -> dict:
    from casus_build.ja.codes import CODES_JSON, encode_analysis
    from casus_build.ja.parse import build_index, jlpt_ranks, parse_entries

    with open_dump(src) as fh:
        entries = list(parse_entries(fh))
    index = build_index(entries, reading_rank=jlpt_ranks(Path(__file__).resolve().parents[1] / "vendor" / "wordlists" / "ja"))

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
    ap.add_argument("code", choices=["grc", "de", "ja", "ar", "ru", "ko", "zh", "mk", "fi", "cs", "pl", "tr", "hu", "is", "el", "sa", "pt", "fr", "es", "en", "it", "nl", "uk"])
    ap.add_argument("--vendor", default="vendor/wiktextract", type=Path)
    ap.add_argument("--data", default="data", type=Path)
    ap.add_argument("--drop-dialects", action="store_true", help="keep only Attic, Koine and unlabelled tables")
    args = ap.parse_args(argv)
    out = args.data / args.code
    t0 = time.time()
    if args.code == "grc":
        manifest = build_grc(args.vendor / "kaikki.org-dictionary-AncientGreek.jsonl", out, args.drop_dialects)
    elif args.code in ("fi", "cs", "pl", "tr", "hu", "is", "el", "sa", "pt", "fr", "es", "en", "it", "nl", "uk"):
        names = {"fi": "Finnish", "cs": "Czech", "pl": "Polish", "tr": "Turkish", "hu": "Hungarian", "is": "Icelandic", "el": "Greek", "sa": "Sanskrit", "pt": "Portuguese", "fr": "French", "es": "Spanish", "en": "English", "it": "Italian", "nl": "Dutch", "uk": "Ukrainian"}
        manifest = build_generic(args.code, args.vendor / f"kaikki.org-dictionary-{names[args.code]}.jsonl", out)
    elif args.code == "mk":
        manifest = build_mk(args.vendor / "kaikki.org-dictionary-Macedonian.jsonl", out)
    elif args.code == "zh":
        manifest = build_zh(args.vendor / "kaikki.org-dictionary-Chinese.jsonl", out)
    elif args.code == "ko":
        manifest = build_ko(args.vendor / "kaikki.org-dictionary-Korean.jsonl", out)
    elif args.code == "ru":
        manifest = build_ru(args.vendor / "kaikki.org-dictionary-Russian.jsonl", out, Path("vendor/wordlists/ru/ru_50k.txt"))
    elif args.code == "ar":
        manifest = build_ar(args.vendor / "kaikki.org-dictionary-Arabic.jsonl", out, Path("vendor/wordlists/ar/ar_50k.txt"))
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
