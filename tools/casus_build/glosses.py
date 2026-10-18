"""Portuguese glosses from the Portuguese Wiktionary (core plan Task 8).

Input: the Wiktextract JSONL of pt.wiktionary's Latin entries (kaikki.org, CC BY-SA/GFDL).
Join: normalised headword (macrons off, i/j u/v folded, lower case) + part of speech, against
every lemma record with that headword — Whitaker lists one word several times. The senses
are joined with "; " like Whitaker's English. A lemma without a match is absent, never empty:
the page distinguishes "no Portuguese, fall back to English" from a blank definition.
"""
from __future__ import annotations

import json
from collections.abc import Iterable

from casus_build.normalize import normalize_form

# Wiktextract pos -> Whitaker pos as lemma_record writes it
_POS = {
    "noun": "noun", "name": "noun", "verb": "verb", "adj": "adj", "adv": "adv", "pron": "pron",
    "num": "num", "conj": "conj", "prep": "prep", "intj": "interj", "interj": "interj",
}


def _key(word: str, pos: str) -> tuple[str, str] | None:
    p = _POS.get(pos)
    if not p:
        return None
    return normalize_form(word), p


def _senses(entry: dict) -> list[str]:
    out: list[str] = []
    for sense in entry.get("senses", []):
        for g in sense.get("glosses", []) or []:
            g = " ".join(str(g).split())
            if g and g not in out:
                out.append(g)
    return out


def build_pt_glosses(jsonl_lines: Iterable[str], lemmas: dict[str, dict]) -> dict[str, str]:
    """lemma id -> Portuguese gloss, for the lemma records the dump covers."""
    by_key: dict[tuple[str, str], list[str]] = {}
    for line in jsonl_lines:
        line = line.strip()
        if not line:
            continue
        entry = json.loads(line)
        if entry.get("lang_code") != "la":
            continue
        key = _key(entry.get("word", ""), entry.get("pos", ""))
        if key is None:
            continue
        senses = _senses(entry)
        if not senses:
            continue
        bucket = by_key.setdefault(key, [])
        for s in senses:
            if s not in bucket:
                bucket.append(s)
    out: dict[str, str] = {}
    for lemma_id, record in lemmas.items():
        key = _key(record.get("headword", ""), record.get("pos", ""))
        if key is None:
            continue
        senses = by_key.get(key)
        if senses:
            out[lemma_id] = "; ".join(senses)
    return out


def gloss_coverage(glosses: dict[str, str], lemmas: dict[str, dict]) -> tuple[float, float]:
    """(share of all lemma records glossed, share of the frequency A–C records glossed)."""
    total = len(lemmas) or 1
    common = [k for k, r in lemmas.items() if r.get("freq") in ("A", "B", "C")]
    overall = sum(1 for k in lemmas if k in glosses) / total
    common_share = (sum(1 for k in common if k in glosses) / len(common)) if common else 0.0
    return overall, common_share
