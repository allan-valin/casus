"""IPA per lemma from a Wiktextract extract (languages plan Task 6).

Joined to the lemma records on normalised headword + part of speech, like glosses.py. Every
pronunciation variant is kept with its tags (Classical-Latin, Ecclesiastical; for Greek the
period tags), deduplicated, audio-only entries dropped. The output is CC BY-SA data and is
written to its own file, never merged into public-domain assets.
"""
from __future__ import annotations

import json
from collections.abc import Callable, Iterable

from casus_build.glosses import _POS
from casus_build.normalize import normalize_form

# a variant Wiktionary describes only in a note gets the tag the note names
_NOTE_TAGS = ("Ecclesiastical", "Classical", "Vulgar", "Medieval", "Koine", "Attic", "Byzantine", "Modern")


def _tags(sound: dict) -> list[str]:
    if sound.get("tags"):
        return list(sound["tags"])
    note = sound.get("note", "")
    hit = next((t for t in _NOTE_TAGS if t.lower() in note.lower()), None)   # priority order: the most specific first
    return [hit] if hit else ([note] if note else [])


def build_ipa(jsonl_lines: Iterable[str], lemmas: dict[str, dict], lang_code: str,
              normalize: Callable[[str], str] = normalize_form) -> dict[str, list[dict]]:
    """lemma id -> [{"ipa": str, "tags": [str]}], for the lemma records the extract covers."""
    by_key: dict[tuple[str, str], list[dict]] = {}
    for line in jsonl_lines:
        line = line.strip()
        if not line:
            continue
        entry = json.loads(line)
        if entry.get("lang_code") != lang_code:
            continue
        senses = entry.get("senses") or []
        if senses and all(sn.get("form_of") or "form-of" in (sn.get("tags") or []) for sn in senses):
            continue                    # an inflected form's page (rosā): its sound is not the lemma's
        pos = _POS.get(entry.get("pos", ""))
        if not pos:
            continue
        variants = by_key.setdefault((normalize(entry.get("word", "")), pos), [])
        for sound in entry.get("sounds", []) or []:
            if not sound.get("ipa"):
                continue
            v = {"ipa": sound["ipa"], "tags": _tags(sound)}
            if v not in variants:
                variants.append(v)
    out: dict[str, list[dict]] = {}
    for lemma_id, record in lemmas.items():
        pos = record.get("pos")
        variants = by_key.get((normalize(record.get("headword", "")), pos))
        if variants:
            out[lemma_id] = variants
    return out


def ipa_coverage(ipa: dict, lemmas: dict) -> float:
    return sum(1 for k in lemmas if k in ipa) / (len(lemmas) or 1)
