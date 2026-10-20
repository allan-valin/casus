#!/usr/bin/env python3
"""Data for the newer drills (docs/DRILLS-RESEARCH-2026-10-20.md items 8, 12, 14), from what the reader already has:

- data/<code>/sounds.json: the most frequent words that have an IPA transcription (Wiktionary), and the minimal pairs
  among them — two words one sound apart (Hölle/Hülle, Staat/Stadt) — for "sound ↔ spelling" and "which did you hear?"
- data/<code>/bins.json: frequent nouns and their gender, to sort into bins

usage: python3 tools/build_drill_extras.py <code> [<code> …]"""
from __future__ import annotations

import json
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKS = set("ˈˌ.‿/[]()-")
LONG = set("ːˑ")
GENDERS = ["m", "f", "n", "c"]


def segments(ipa: str) -> list:
    """the sounds of a transcription: each letter with its combining diacritics, tie bars and length marks"""
    out = []
    for ch in ipa:
        if ch in MARKS or ch.isspace():
            continue
        if out and (unicodedata.combining(ch) or ch in LONG or ch in "ʰʲʷˠˤⁿˡ" or ch == "͡" or out[-1].endswith("͡")):
            out[-1] += ch
        else:
            out.append(ch)
    return out


def minimal_pair(a: list, b: list) -> bool:
    """same length, exactly one sound different"""
    return len(a) == len(b) and sum(x != y for x, y in zip(a, b)) == 1


def _key(w: str) -> str:
    return unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", w) if c != "́")).lower()


def _by_headword(lemmas: dict) -> dict:
    """a word as the frequency list writes it — the headword, or the dictionary form (der Mann, челове́к (m.)) — → lemmas"""
    out = {}
    for lid, e in lemmas.items():
        for k in {_key(e.get("headword", "")), _key(e.get("dict_form", ""))}:
            out.setdefault(k, []).append(lid)
    return out


JUNK = ("initialism", "abbreviation", "the name of", "acronym", "alternative form", "misspelling")


def _junk(f: dict) -> bool:
    """a frequent function word glossed as its rare noun (Spanish te "the letter T")"""
    return any(f.get("en", "").lower().startswith(j) for j in JUNK)


def sounds(freq: list, lemmas: dict, ipa: dict, most: int = 1500, max_pairs: int = 600) -> dict:
    heads = _by_headword(lemmas)
    words, seen = [], set()
    for f in freq:
        if _key(f["w"]) in seen or _junk(f):
            continue
        for lid in heads.get(_key(f["w"]), []):
            t = next((x["ipa"] for x in ipa.get(lid, []) if x.get("ipa")), None)
            if t:
                seen.add(_key(f["w"]))
                words.append({"w": lemmas[lid]["headword"], "ipa": t, "en": f.get("en", "")})
                break
        if len(words) >= most:
            break
    segs = [segments(w["ipa"]) for w in words]
    by_len = {}
    for i, s in enumerate(segs):
        by_len.setdefault(len(s), []).append(i)
    pairs = []
    for idx in by_len.values():
        for x, i in enumerate(idx):
            for j in idx[x + 1:]:
                if minimal_pair(segs[i], segs[j]) and _key(words[i]["w"]) != _key(words[j]["w"]):
                    pairs.append([i, j])
                    if len(pairs) >= max_pairs:
                        return {"words": words, "pairs": pairs}
    return {"words": words, "pairs": pairs}


def bins(freq: list, lemmas: dict, most: int = 600) -> dict:
    """frequent nouns of one gender only (a word with two, like French livre, is left out)"""
    genders, heads = {}, {}
    for e in lemmas.values():
        if e.get("pos") == "noun" and e.get("gender") in GENDERS:
            genders.setdefault(_key(e["headword"]), set()).add(e["gender"])
            heads[_key(e.get("dict_form", ""))] = heads[_key(e["headword"])] = e["headword"]
    items, seen = [], set()
    for f in freq:
        # (Latin and Greek core lists write "rosa rosae f." with "Noun: 1st declension": the first word is the headword)
        hw = heads.get(_key(f["w"])) or heads.get(_key(f["w"].split(" ")[0].rstrip(",")))
        k = _key(hw or "")
        g = genders.get(k)
        if not hw or k in seen or not g or len(g) != 1 or (f.get("pos") and not f["pos"].lower().startswith("noun")) or _junk(f):
            continue
        seen.add(k)
        items.append({"w": hw, "en": f.get("en", ""), "bin": next(iter(g))})
        if len(items) >= most:
            break
    # a gender almost no frequent noun has is a dictionary oddity (Portuguese neuter "garote"): left out
    counts = {g: sum(i["bin"] == g for i in items) for g in GENDERS}
    items = [i for i in items if counts[i["bin"]] >= -(-len(items) // 30)]
    present = {i["bin"] for i in items}
    return {"kind": "gender", "bins": [g for g in GENDERS if g in present], "items": items}


def main(code: str) -> None:
    d = ROOT / "data" / code
    load = lambda name: json.loads((d / name).read_text(encoding="utf-8")) if (d / name).exists() else None   # noqa: E731
    freq, lemmas, ipa = load("frequency.json") or [], load("lemmas.json") or {}, load("ipa.json") or {}
    dump = lambda obj: json.dumps(obj, ensure_ascii=False, separators=(",", ":"))   # noqa: E731
    s = sounds(freq, lemmas, ipa)
    (d / "sounds.json").write_text(dump(s), encoding="utf-8")
    b = bins(freq, lemmas)
    if len(b["bins"]) >= 2 and len(b["items"]) >= 20:
        (d / "bins.json").write_text(dump(b), encoding="utf-8")
    print(f"{code}: {len(s['words'])} words with IPA, {len(s['pairs'])} minimal pairs; {len(b['items'])} nouns in {b['bins']}")


if __name__ == "__main__":
    for c in sys.argv[1:]:
        main(c)
