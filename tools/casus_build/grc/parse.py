"""Ancient Greek entries and analyses from the English Wiktionary's Wiktextract extract (languages plan
Task 11). Tense is the label of the conjugation table a form sits in; cases, numbers, genders, persons,
moods and voices are the form's tags; a cell tagged with two values (τοῦ: masculine and neuter) gives one
analysis per value. Inflected-form pages (all senses form-of) are skipped: their forms are in their
lemma's table.
"""
from __future__ import annotations

import json
import re
import unicodedata
from collections.abc import Iterable, Iterator
from itertools import product

from casus_build.grc.normalize import normalize_grc, strip_grc
from casus_build.grc.prepositions import GOVERNMENT

POS = {"noun": "noun", "name": "noun", "adj": "adj", "verb": "verb", "pron": "pron", "det": "det",
       "article": "det", "num": "num", "adv": "adv", "prep": "prep", "conj": "conj", "particle": "particle",
       "intj": "interj"}
NOMINAL = {"noun", "adj", "pron", "det", "num"}
UNINFLECTED = {"adv", "prep", "conj", "particle", "interj"}

CASES = {"nominative": "nom", "vocative": "voc", "genitive": "gen", "dative": "dat", "accusative": "acc"}
NUMBERS = {"singular": "sg", "dual": "du", "plural": "pl"}
GENDERS = {"masculine": "m", "feminine": "f", "neuter": "n"}
PERSONS = {"first-person": "1", "second-person": "2", "third-person": "3"}
MOODS = {"indicative": "ind", "subjunctive": "sub", "optative": "opt", "imperative": "imp", "infinitive": "inf"}
DEGREES = {"comparative": "comp", "superlative": "super"}
SKIP_TAGS = {"canonical", "romanization", "table-tags", "inflection-template", "class", "adverbial"}
_SUPERSCRIPT = str.maketrans("ᵗʰˢᵈⁿʳ", "thsdnr")


def _tense(label: str | None) -> str:
    label = (label or "").lower()
    for word, tense in (("future perfect", "futp"), ("pluperfect", "plup"), ("imperfect", "impf"),
                        ("perfect", "perf"), ("aorist", "aor"), ("future", "fut"), ("present", "pres")):
        if word in label:
            return tense
    return "x"


def _voice(tags: set[str]) -> str:
    if "middle" in tags and "passive" in tags:
        return "mp"
    if "middle" in tags:
        return "mid"
    if "passive" in tags:
        return "pass"
    if "active" in tags:
        return "act"
    return "x"


def _picked(tags: set[str], table: dict) -> list[str]:
    return [v for k, v in table.items() if k in tags]


def _gender_of(entry: dict) -> str | None:
    found = []
    for sense in entry.get("senses") or []:
        for t in sense.get("tags") or []:
            if t in GENDERS and GENDERS[t] not in found:
                found.append(GENDERS[t])
    if not found:
        # grc-noun puts the gender in its arguments ('3': 'f'), not always in the sense tags
        for ht in entry.get("head_templates") or []:
            for g in re.findall(r"\b([mfn])\b", " ".join(str(v) for v in (ht.get("args") or {}).values() if len(str(v)) <= 5)):
                if g not in found:
                    found.append(g)
    if len(found) == 1:
        return found[0]
    return "c" if len(found) > 1 else None


def _decl_of(entry: dict) -> str | None:
    for sense in entry.get("senses") or []:
        for t in sense.get("tags") or []:
            m = re.fullmatch(r"declension-(\d)", t)
            if m:
                return m.group(1)
    for ht in entry.get("head_templates") or []:
        m = re.search(r"(first|second|third) declension", ht.get("expansion", ""))
        if m:
            return {"first": "1", "second": "2", "third": "3"}[m.group(1)]
    return None


def _gloss(entry: dict) -> str:
    out = []
    for sense in entry.get("senses") or []:
        for g in (sense.get("glosses") or [])[:1]:
            g = " ".join(str(g).split())
            if g and g not in out:
                out.append(g)
    return "; ".join(out)


def _ipa(entry: dict) -> list[dict]:
    out = []
    for s in entry.get("sounds") or []:
        if not s.get("ipa"):
            continue
        tags = list(s["tags"]) if s.get("tags") else ([s["note"].translate(_SUPERSCRIPT)] if s.get("note") else [])
        v = {"ipa": s["ipa"], "tags": tags}
        if v not in out:
            out.append(v)
    # the untagged head transcriptions repeat the period ones: drop an untagged one whose IPA a tagged one has
    tagged = {v["ipa"] for v in out if v["tags"]}
    return [v for v in out if v["tags"] or v["ipa"] not in tagged]


def parse_entries(jsonl_lines: Iterable[str]) -> Iterator[dict]:
    for i, line in enumerate(jsonl_lines):
        line = line.strip()
        if not line:
            continue
        entry = json.loads(line)
        if entry.get("lang_code") != "grc":
            continue
        pos = POS.get(entry.get("pos", ""))
        if not pos:
            continue
        senses = entry.get("senses") or []
        if senses and all(s.get("form_of") or "form-of" in (s.get("tags") or []) for s in senses):
            continue
        yield {
            "id": i,
            "headword": unicodedata.normalize("NFC", entry["word"]),
            "pos": pos,
            "gender": _gender_of(entry),
            "decl": _decl_of(entry),
            "gloss_en": _gloss(entry),
            "ipa": _ipa(entry),
            "forms": entry.get("forms") or [],
            "dialect_tables": True,
        }


_GREEK = re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]")
_MOVABLE = re.compile(r"^(.*)\((\w+)\)$")


def _usable(form: str) -> bool:
    """A Greek word: no romanization (Latin letters only), no spaces, hyphens, apostrophes or editorial marks."""
    return bool(_GREEK.search(form)) and not re.search(r"[\s\-'’?‡()*]", form)


def _expanded(forms: list[dict]) -> list[dict]:
    """Wiktionary writes movable nu as ἐστῐ́(ν): one cell, two words — ἐστί and ἐστίν."""
    out = []
    for f in forms:
        m = _MOVABLE.match(f.get("form", ""))
        if m:
            out.append({**f, "form": m.group(1)})
            out.append({**f, "form": m.group(1) + m.group(2)})
        else:
            out.append(f)
    return out


def analyses_of(entry: dict) -> list[tuple[str, dict]]:
    """(surface form, analysis) for every cell of the entry's tables; the headword alone when it has none."""
    pos = entry["pos"]
    out: list[tuple[str, dict]] = []
    if pos in UNINFLECTED:
        if pos == "prep":
            governs = GOVERNMENT.get(normalize_grc(entry["headword"]), ["x"])
            return [(entry["headword"], {"pos": "prep", "governs": g}) for g in governs]
        if pos == "adv":
            return [(entry["headword"], {"pos": "adv", "degree": "pos"})]
        return [(entry["headword"], {"pos": pos})]
    label = None
    for f in _expanded(entry["forms"]):
        tags = set(f.get("tags") or [])
        form = f.get("form", "")
        if "table-tags" in tags:
            label = form
            continue
        if tags & SKIP_TAGS or not form or not _usable(form):
            continue
        cases, numbers, genders = _picked(tags, CASES), _picked(tags, NUMBERS), _picked(tags, GENDERS)
        if pos == "verb":
            tense, voice = _tense(label), _voice(tags)
            if "participle" in tags or (cases and f.get("source") == "declension"):
                for c, n, g in product(cases or ["nom"], numbers or ["sg"], genders or ["x"]):
                    out.append((form, {"pos": "vpar", "case": c, "number": n, "gender": g, "tense": tense, "voice": voice}))
            elif "infinitive" in tags:
                out.append((form, {"pos": "verb", "person": "0", "number": "x", "tense": tense, "mood": "inf", "voice": voice}))
            else:
                moods, persons = _picked(tags, MOODS), _picked(tags, PERSONS)
                if not moods or not persons or not numbers:
                    continue
                for p, n, m in product(persons, numbers, moods):
                    out.append((form, {"pos": "verb", "person": p, "number": n, "tense": tense, "mood": m, "voice": voice}))
            continue
        if not cases or not numbers:
            continue
        gs = genders or [entry.get("gender") or "x"]
        degree = (_picked(tags, DEGREES) or ["pos"])[0]
        for c, n, g in product(cases, numbers, gs):
            a = {"pos": pos, "case": c, "number": n, "gender": g}
            if pos == "adj":
                a["degree"] = degree
            out.append((form, a))
    if not out and pos in NOMINAL:
        a = {"pos": pos, "case": "nom", "number": "sg", "gender": entry.get("gender") or "x"}
        if pos == "adj":
            a["degree"] = "pos"
        out.append((entry["headword"], a))
    return out


def build_index(entries: Iterable[dict]) -> dict[str, list[dict]]:
    """normalised form -> analyses (each with its lemma id). Only marked keys: a form typed without
    diacritics is matched by the page against the shard it loads anyway (shards are named by the
    stripped prefix), which costs no data (languages plan Task 11, size gate)."""
    index: dict[str, list[dict]] = {}
    seen: dict[str, set] = {}

    def add(key: str, a: dict) -> None:
        sig = tuple(sorted(a.items()))
        if sig in seen.setdefault(key, set()):
            return
        seen[key].add(sig)
        index.setdefault(key, []).append(a)

    for e in entries:
        for form, a in analyses_of(e):
            key = normalize_grc(form)
            add(key, {**a, "lemma": e["id"]})
    return index
