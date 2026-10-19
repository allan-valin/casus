"""Russian entries and the form index from the English Wiktionary's Wiktextract extract (overnight plan
2026-10-19). Forms keep their stress marks (the page supplies them over unstressed text). Kept: noun and
adjective case forms; the finite verb (present/future by person, past by gender and number), imperative and
infinitive. Left out: participle declensions, compound futures (буду читать), dated spellings, romanisation."""
from __future__ import annotations

import json
import re
from collections.abc import Iterable, Iterator

POS = {"noun": "noun", "name": "noun", "adj": "adj", "verb": "verb", "pron": "pron", "det": "det", "num": "num",
       "adv": "adv", "prep": "prep", "conj": "conj", "particle": "particle", "intj": "interj"}
CASES = {"nominative": "nom", "genitive": "gen", "dative": "dat", "accusative": "acc", "instrumental": "ins", "prepositional": "pre"}
NUMBERS = {"singular": "sg", "plural": "pl"}
GENDERS = {"masculine": "m", "feminine": "f", "neuter": "n"}
PERSONS = {"first-person": "1", "second-person": "2", "third-person": "3"}
SKIP = {"romanization", "table-tags", "inflection-template", "class", "dated", "participle", "adverbial", "comparative",
        "superlative", "diminutive", "augmentative", "relational", "adjective", "noun-from-verb", "alternative", "obsolete", "archaic"}
_CYR = re.compile(r"[Ѐ-ӿ]")
_OLD = re.compile(r"[ѣіѳѵ]|ъ$")            # pre-1918 spelling


def _many(tags, table):
    return [v for k, v in table.items() if k in tags]


def _analyses(pos: str, tags: set, gender: str | None, aspect: str | None) -> list[dict]:
    if pos in ("noun", "adj", "pron", "det", "num"):
        cases, numbers = _many(tags, CASES), _many(tags, NUMBERS)
        if len(cases) != 1:
            return []
        genders = _many(tags, GENDERS) or ([gender] if gender else [None])
        number = numbers[0] if len(numbers) == 1 else ("pl" if pos == "adj" and "plural" in tags else "sg" if pos == "noun" else None)
        return [{"pos": pos, "case": cases[0], "number": number, "gender": None if number == "pl" else g} for g in genders]
    if pos == "verb":
        numbers = _many(tags, NUMBERS)
        if "imperative" in tags and len(numbers) == 1:
            return [{"pos": "verb", "person": "2", "number": numbers[0], "tense": "pres", "mood": "imp", "aspect": aspect}]
        if "past" in tags and len(numbers) == 1:
            gs = _many(tags, GENDERS)
            if numbers[0] == "pl":
                return [{"pos": "verb", "number": "pl", "tense": "past", "mood": "ind", "aspect": aspect}]
            return [{"pos": "verb", "number": "sg", "gender": g, "tense": "past", "mood": "ind", "aspect": aspect} for g in gs[:1]]
        persons = _many(tags, PERSONS)
        if persons and len(numbers) == 1 and ("present" in tags or "future" in tags):
            return [{"pos": "verb", "person": persons[0], "number": numbers[0], "tense": "fut" if "future" in tags else "pres", "mood": "ind", "aspect": aspect}]
        if "infinitive" in tags:
            return [{"pos": "verb", "mood": "inf", "aspect": aspect}]
    return []


def parse_entries(lines: Iterable[str]) -> Iterator[dict]:
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        d = json.loads(line)
        pos = POS.get(d.get("pos", ""))
        word = (d.get("word") or "").strip()
        if not pos or not word or " " in word or not _CYR.search(word):
            continue
        senses = d.get("senses") or []
        # an entry that is only an inflected form of another word (читаю: of читать) adds no lemma of its own
        if senses and all(set(x.get("tags") or []) & {"form-of", "alt-of"} for x in senses):
            continue
        forms = d.get("forms") or []
        canon = next((f for f in forms if "canonical" in (f.get("tags") or [])), None)
        ctags = set((canon or {}).get("tags") or [])
        headword = (canon or {}).get("form") or word
        gender = next((v for k, v in GENDERS.items() if k in ctags), None)
        aspect = "pf" if "perfective" in ctags else "impf" if "imperfective" in ctags else None
        cells = []
        for f in forms:
            tags = set(f.get("tags") or [])
            text = (f.get("form") or "").strip()
            if not text or " " in text or not _CYR.search(text) or tags & SKIP or "canonical" in tags or _OLD.search(text):
                continue
            for a in _analyses(pos, tags, gender, aspect):
                cells.append((text, a))
        if pos == "verb":
            cells.append((headword, {"pos": "verb", "mood": "inf", "aspect": aspect}))
        gloss = "; ".join(dict.fromkeys(" ".join(g.split()) for s in senses for g in (s.get("glosses") or [])[:1] if g))
        ipa = [{"ipa": s["ipa"], "tags": list(s.get("tags") or [])} for s in d.get("sounds") or [] if s.get("ipa")]
        partner = next((f.get("form") for f in forms if ("perfective" if aspect == "impf" else "imperfective") in (f.get("tags") or []) and f.get("form") != headword), None) if aspect else None
        yield {"id": i, "headword": headword, "pos": pos, "gender": gender, "aspect": aspect, "partner": partner, "cells": cells,
               "gloss_en": gloss, "ipa": ipa[:3]}


def build_index(entries: list[dict]) -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}
    for e in entries:
        base = {"lemma": e["id"], "pos": e["pos"]}
        rows_for = e["cells"] or [(e["headword"], {"pos": e["pos"]})]
        for text, a in rows_for:
            rows = index.setdefault(text.lower() if e["pos"] != "noun" or text[:1].islower() else text, [])
            full = {**base, **{k: v for k, v in a.items() if k != "pos" and v is not None}}
            if full not in rows:
                rows.append(full)
    return index


def tidy(entries: list[dict]) -> list[dict]:
    """a personal pronoun's table lists the other pronouns too (я … она́): a cell that is another pronoun's
    headword is dropped"""
    import unicodedata
    plain = lambda w: unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", w.lower()) if c not in "\u0301\u0300"))
    heads = {plain(e["headword"]) for e in entries if e["pos"] == "pron"}
    for e in entries:
        if e["pos"] == "pron":
            own = plain(e["headword"])
            e["cells"] = [(t, a) for t, a in e["cells"] if plain(t) == own or plain(t) not in heads]
    return entries
