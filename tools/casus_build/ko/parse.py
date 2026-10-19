"""Korean entries and the form index (overnight plan 2026-10-19). Verbs and adjectives keep their conjugated forms,
named by speech level, tense and sentence type (해요 haeyo, 합니다 hamnida, 해 hae, 한다 handa; past; question);
the particles, which Wiktionary barely lists as words, come from PARTICLES with their roles."""
from __future__ import annotations

import json
import re
from collections.abc import Iterable, Iterator

POS = {"noun": "noun", "verb": "verb", "adj": "adj", "adv": "adv", "pron": "pron", "num": "num", "det": "det",
       "intj": "interj", "counter": "noun"}
_HANGUL = re.compile(r"[가-힣]")

# particle -> (role, gloss); the role colours the word before it (the same roles as Japanese)
PARTICLES = {
    "은": ("top", "topic marker (after a consonant)"), "는": ("top", "topic marker (after a vowel)"),
    "이": ("sbj", "subject marker (after a consonant)"), "가": ("sbj", "subject marker (after a vowel)"), "께서": ("sbj", "subject marker (honorific)"),
    "을": ("obj", "object marker (after a consonant)"), "를": ("obj", "object marker (after a vowel)"),
    "에": ("tgt", "to, at, in (place or time)"), "에게": ("tgt", "to (a person)"), "한테": ("tgt", "to (a person, spoken)"), "께": ("tgt", "to (a person, honorific)"),
    "에서": ("loc", "at, in (where something happens); from"), "의": ("gen", "of, 's (possessive)"),
    "와": ("com", "and, with (after a vowel)"), "과": ("com", "and, with (after a consonant)"), "하고": ("com", "and, with"), "랑": ("com", "and, with (spoken, after a vowel)"),
    "이랑": ("com", "and, with (spoken, after a consonant)"), "로": ("src", "by means of, towards, as (after a vowel or ㄹ)"),
    "으로": ("src", "by means of, towards, as (after a consonant)"), "부터": ("src", "from (a starting point)"), "까지": ("src", "until, up to"),
    "도": (None, "also, too, even"), "만": (None, "only"), "보다": (None, "than"), "처럼": (None, "like, as"), "요": (None, "polite ending particle"),
    # stacked particles (Allan, 2026-10-19: 때에는 was unknown): the role is the first one's
    "에는": ("tgt", "at, to, in (topic)"),
    "에서는": ("loc", "at, in, from (topic)"),
    "에게는": ("tgt", "to (a person; topic)"),
    "한테는": ("tgt", "to (a person, spoken; topic)"),
    "으로는": ("src", "by, towards, as (topic)"),
    "로는": ("src", "by, towards, as (topic)"),
    "와는": ("com", "with (topic)"),
    "과는": ("com", "with (topic)"),
    "하고는": ("com", "with (topic)"),
    "에도": ("tgt", "also at, to, in"),
    "에서도": ("loc", "also at, in, from"),
    "에게도": ("tgt", "also to (a person)"),
    "한테도": ("tgt", "also to (a person, spoken)"),
    "으로도": ("src", "also by, towards"),
    "로도": ("src", "also by, towards"),
    "까지는": ("src", "up to (topic)"),
    "부터는": ("src", "from (topic)"),
    "까지도": ("src", "even up to"),
    "에만": ("tgt", "only at, to"),
    "에서만": ("loc", "only at, in"),
    "에서부터": ("src", "starting from"),
    "께서는": ("sbj", "subject, honorific (topic)"),
    "께서도": ("sbj", "subject, honorific (also)"),
    "마다": (None, "every, each"),
    "밖에": (None, "only, nothing but (with a negative)"),
    "조차": (None, "even"),
    "마저": (None, "even, to the last"),
    "이나": (None, "or; as much as (after a consonant)"),
    "나": (None, "or (after a vowel)"),
    "만은": (None, "at least, only (topic)"),
}


def form_name(tags: set) -> str | None:
    if "infinitive" in tags:
        return "inf"
    if "sequential" in tags:
        return "seq"
    if "conditional" in tags:
        return "if"
    if "noun-from-verb" in tags or "causative" in tags or "table-tags" in tags or "class" in tags or "inflection-template" in tags:
        return None
    level = ("hamnida" if "polite" in tags else "handa") if "formal" in tags else ("haeyo" if "polite" in tags else "hae") if "informal" in tags else None
    if not level:
        return None
    kind = " q" if "interrogative" in tags else " imp" if "imperative" in tags else " let" if ("propositive" in tags or "hortative" in tags) else ""
    return level + (" past" if "past" in tags else "") + kind


def parse_entries(lines: Iterable[str]) -> Iterator[dict]:
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        pos = POS.get(d.get("pos", ""))
        word = (d.get("word") or "").strip()
        if not pos or not word or " " in word or not _HANGUL.search(word):
            continue
        senses = d.get("senses") or []
        if senses and all(set(x.get("tags") or []) & {"form-of", "alt-of"} for x in senses):
            continue                                  # an inflected form listed as its own entry (가요 of 가다)
        cells = []
        for f in d.get("forms") or []:
            text = (f.get("form") or "").strip()
            if not text or " " in text or not _HANGUL.search(text):
                continue
            name = form_name(set(f.get("tags") or [])) if pos in ("verb", "adj") else None
            if name:
                cells.append((text, name))
        senses = d.get("senses") or []
        gloss = "; ".join(dict.fromkeys(" ".join(g.split()) for s in senses for g in (s.get("glosses") or [])[:1] if g))
        ipa = [{"ipa": s["ipa"], "tags": list(s.get("tags") or [])} for s in d.get("sounds") or [] if s.get("ipa")]
        hanja = next((f["form"] for f in d.get("forms") or [] if "hanja" in (f.get("tags") or [])), None)
        yield {"id": i, "headword": word, "pos": pos, "cells": cells, "gloss_en": gloss, "ipa": ipa[:3], "hanja": hanja}


def particle_entries(start: int) -> list[dict]:
    return [{"id": start + k, "headword": p, "pos": "particle", "cells": [], "gloss_en": g, "ipa": [], "hanja": None, "role": r}
            for k, (p, (r, g)) in enumerate(PARTICLES.items())]


def build_index(entries: list[dict]) -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}
    for e in entries:
        base = {"lemma": e["id"], "pos": e["pos"]}
        rows = [(e["headword"], {**base, "form": "dict"} if e["pos"] in ("verb", "adj") else base)]
        rows += [(t, {**base, "form": n}) for t, n in e["cells"]]
        for text, a in rows:
            r = index.setdefault(text, [])
            if a not in r:
                r.append(a)
    return index
