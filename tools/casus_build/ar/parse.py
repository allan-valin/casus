"""Arabic entries and the form index from the English Wiktionary's Wiktextract extract (overnight plan
2026-10-19). Forms are kept fully vowelled (the page matches bare input against them and supplies the vowels);
informal (pausal) and romanised cells are left out."""
from __future__ import annotations

import json
import re
from collections.abc import Iterable, Iterator

POS = {"noun": "noun", "adj": "adj", "verb": "verb", "pron": "pron", "num": "num", "adv": "adv", "prep": "prep",
       "conj": "conj", "particle": "particle", "intj": "interj",
       "name": "noun"}                              # Arabic writes no capitals: names (الله) come from the dictionary
CASES = {"nominative": "nom", "accusative": "acc", "genitive": "gen"}
NUMBERS = {"singular": "sg", "dual": "du", "plural": "pl"}
GENDERS = {"masculine": "m", "feminine": "f"}
STATES = {"definite": "def", "indefinite": "indef", "construct": "cons"}
PERSONS = {"first-person": "1", "second-person": "2", "third-person": "3"}
MOODS = {"indicative": "ind", "subjunctive": "subj", "jussive": "juss", "imperative": "imp"}
_AR = re.compile(r"[؀-ۿ]")


def _one(tags: set, table: dict):
    hits = [v for k, v in table.items() if k in tags]
    return hits[0] if len(hits) == 1 else None


def _analysis(pos: str, tags: set, gender: str | None) -> dict | None:
    if pos in ("noun", "adj", "num", "pron"):
        case, number, state = _one(tags, CASES), _one(tags, NUMBERS), _one(tags, STATES)
        if not case or not number:
            return None
        return {"pos": pos, "case": case, "number": number, "gender": _one(tags, GENDERS) or gender, "state": state}
    if pos == "verb":
        person, number = _one(tags, PERSONS), _one(tags, NUMBERS)
        if not person or not number:
            return None
        if "imperative" in tags:
            tense, mood = "npast", "imp"
        elif "past" in tags or "perfective" in tags:
            tense, mood = "past", "ind"
        else:
            tense, mood = "npast", _one(tags, MOODS) or ("ind" if "indicative" in tags else None)
        if not mood:
            return None
        return {"pos": "verb", "person": person, "number": number, "gender": _one(tags, GENDERS), "tense": tense, "mood": mood,
                "voice": "pass" if "passive" in tags else "act"}
    return None


def parse_entries(lines: Iterable[str]) -> Iterator[dict]:
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        pos = POS.get(d.get("pos", ""))
        word = (d.get("word") or "").strip()
        if not pos or not word or " " in word or not _AR.search(word):
            continue
        forms = d.get("forms") or []
        canon = next((f for f in forms if "canonical" in (f.get("tags") or [])), None)
        headword = (canon or {}).get("form") or word
        gender = _one(set((canon or {}).get("tags") or []), GENDERS)
        plural = next((f["form"] for f in forms if (f.get("tags") or []) == ["plural"]), None)
        cells = []
        for f in forms:
            tags = set(f.get("tags") or [])
            text = (f.get("form") or "").strip()
            if not text or not _AR.search(text) or " " in text or tags & {"informal", "romanization", "canonical", "table-tags", "inflection-template"}:
                continue
            a = _analysis(pos, tags, gender)
            if a:
                cells.append((text, a))
        senses = d.get("senses") or []
        gloss = "; ".join(dict.fromkeys(" ".join(g.split()) for s in senses for g in (s.get("glosses") or [])[:1] if g))
        ipa = [{"ipa": s["ipa"], "tags": list(s.get("tags") or [])} for s in d.get("sounds") or [] if s.get("ipa")]
        yield {"id": i, "headword": headword, "pos": pos, "gender": gender, "plural": plural, "cells": cells,
               "gloss_en": gloss, "ipa": ipa[:3], "verb_form": next((t[5:].upper() for f in forms for t in (f.get("tags") or []) if t.startswith("form-")), None)}


def build_index(entries: list[dict]) -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}

    def add(form: str, a: dict):
        rows = index.setdefault(form, [])
        if a not in rows:
            rows.append(a)

    for e in entries:
        base = {"lemma": e["id"], "pos": e["pos"]}
        for text, a in e["cells"]:
            add(text, {**base, **{k: v for k, v in a.items() if k != "pos"}})
        if not e["cells"]:                           # uninflected words (prepositions, particles…) under the headword
            add(e["headword"], base)
    return index
