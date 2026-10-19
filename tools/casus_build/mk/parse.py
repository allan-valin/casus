"""Macedonian entries and the form index (overnight plan 2026-10-19): nouns and adjectives by definiteness (indefinite,
definite, proximal, distal, vocative), number and gender; verbs by person, number and tense (present, imperfect, aorist,
imperative) and the l-participle by gender and number; aspect from the head. Multiword cells (perfects) are left out."""
from __future__ import annotations

import json
import re
from collections.abc import Iterable, Iterator

POS = {"noun": "noun", "name": "noun", "adj": "adj", "verb": "verb", "pron": "pron", "det": "det", "num": "num", "adv": "adv",
       "prep": "prep", "conj": "conj", "particle": "particle", "intj": "interj"}
NUMBERS = {"singular": "sg", "plural": "pl"}
GENDERS = {"masculine": "m", "feminine": "f", "neuter": "n"}
PERSONS = {"first-person": "1", "second-person": "2", "third-person": "3"}
SKIP = {"romanization", "table-tags", "inflection-template", "multiword-construction", "diminutive", "augmentative", "relational",
        "adjective", "abstract-noun", "comparative", "superlative", "adverb", "canonical", "alternative"}
_CYR = re.compile(r"[Ѐ-ӿ]")


def _one(tags, table):
    hits = [v for k, v in table.items() if k in tags]
    return hits[0] if len(hits) == 1 else None


def _definiteness(tags):
    if "vocative" in tags:
        return "voc"
    if "indefinite" in tags:
        return "indef"
    if "definite" in tags:
        return "prox" if "proximal" in tags else "dist" if "distal" in tags else "def"
    return None


def _analysis(pos, tags, gender, aspect):
    if pos in ("noun", "adj", "pron", "det", "num"):
        d = _definiteness(tags)
        if not d:
            return None
        number = _one(tags, NUMBERS) or ("sg" if _one(tags, GENDERS) else None)
        return {"pos": pos, "case": d, "number": number, "gender": _one(tags, GENDERS) or (gender if pos == "noun" else None)}
    if pos == "verb":
        number = _one(tags, NUMBERS)
        person = _one(tags, PERSONS)
        tense = "imp" if "imperative" in tags else "aor" if "aorist" in tags else "impf" if "imperfect" in tags else "pres" if "present" in tags else None
        if person and number and tense:
            return {"pos": "verb", "person": person, "number": number, "tense": tense, "aspect": aspect}
        if tense in ("impf", "aor") and not person:                     # the l-participle (читал, читала…)
            return {"pos": "verb", "number": number or "sg", "gender": _one(tags, GENDERS), "tense": "lpart", "aspect": aspect}
    return None


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
        if senses and all(set(x.get("tags") or []) & {"form-of", "alt-of"} for x in senses):
            continue
        forms = d.get("forms") or []
        canon = next((f for f in forms if "canonical" in (f.get("tags") or [])), None)
        ctags = set((canon or {}).get("tags") or [])
        aspect = "pf" if "perfective" in ctags else "impf" if "imperfective" in ctags else None
        gender = next((v for k, v in GENDERS.items() if any(k in (s.get("tags") or []) for s in senses)), None)
        if gender is None:
            tmpl = next((f.get("form") for f in forms if "inflection-template" in (f.get("tags") or [])), "") or ""
            gender = {"m": "m", "f": "f", "n": "n"}.get(tmpl.rsplit("-", 1)[-1]) if tmpl.startswith("mk-decl-noun") else None
        cells = []
        for f in forms:
            tags = set(f.get("tags") or [])
            text = (f.get("form") or "").strip()
            if not text or " " in text or text == "-" or not _CYR.search(text) or tags & SKIP:
                continue
            a = _analysis(pos, tags, gender, aspect)
            if a:
                cells.append((text, a))
        if pos == "verb":
            cells.append((word, {"pos": "verb", "person": "3", "number": "sg", "tense": "pres", "aspect": aspect}))
        gloss = "; ".join(dict.fromkeys(" ".join(g.split()) for s in senses for g in (s.get("glosses") or [])[:1] if g))
        ipa = [{"ipa": s["ipa"], "tags": list(s.get("tags") or [])} for s in d.get("sounds") or [] if s.get("ipa")]
        yield {"id": i, "headword": word, "pos": pos, "gender": gender, "aspect": aspect, "cells": cells, "gloss_en": gloss, "ipa": ipa[:3]}


def build_index(entries: list[dict]) -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}
    for e in entries:
        base = {"lemma": e["id"], "pos": e["pos"]}
        for text, a in (e["cells"] or [(e["headword"], {"pos": e["pos"]})]):
            key = text.lower() if e["pos"] != "noun" or text[:1].islower() else text
            full = {**base, **{k: v for k, v in a.items() if k != "pos" and v is not None}}
            rows = index.setdefault(key, [])
            if full not in rows:
                rows.append(full)
    return index
