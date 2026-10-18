"""German entries and analyses from the English Wiktionary's Wiktextract extract (languages phase 3, Task 1).

Cells give case/number/gender/declension type/degree (nominals) or person/number/tense/mood (verbs) as tags.
Multiword cells are skipped (compound tenses, article + noun), except article + adjective cells, which are
the only place weak and mixed adjective endings appear: their last word is taken. Keys keep case (Essen ≠
essen), ß and umlauts (docs/languages/de.md §8).
"""
from __future__ import annotations

import json
import re
import unicodedata
from collections.abc import Iterable, Iterator
from itertools import product

from casus_build.de.prepositions import GOVERNMENT

POS = {"noun": "noun", "name": "noun", "adj": "adj", "verb": "verb", "pron": "pron", "det": "det",
       "article": "det", "num": "num", "adv": "adv", "prep": "prep", "conj": "conj", "particle": "particle",
       "intj": "interj"}
NOMINAL = {"noun", "adj", "pron", "det", "num"}
UNINFLECTED = {"adv", "prep", "conj", "particle", "interj"}
CASES = {"nominative": "nom", "genitive": "gen", "dative": "dat", "accusative": "acc"}
NUMBERS = {"singular": "sg", "plural": "pl"}
GENDERS = {"masculine": "m", "feminine": "f", "neuter": "n"}
PERSONS = {"first-person": "1", "second-person": "2", "third-person": "3"}
INFL = {"strong": "strong", "weak": "weak", "mixed": "mixed"}
SKIP_TAGS = {"canonical", "romanization", "table-tags", "inflection-template", "class", "diminutive",
             "multiword-construction", "auxiliary", "error-unrecognized-form",
             "future", "future-i", "future-ii", "perfect", "pluperfect", "infinitive-zu", "negative"}
_WORD = re.compile(r"^[\wäöüÄÖÜß][\wäöüÄÖÜß\-']*$")
ARTICLE = {"m": "der", "f": "die", "n": "das"}


def _gender_of(entry: dict) -> str | None:
    found = []
    for sense in entry.get("senses") or []:
        for t in sense.get("tags") or []:
            if t in GENDERS and GENDERS[t] not in found:
                found.append(GENDERS[t])
    if not found:
        for ht in entry.get("head_templates") or []:
            first = str((ht.get("args") or {}).get("1", ""))
            g = first.split(",")[0].strip()
            if g in ("m", "f", "n"):
                found.append(g)
    return found[0] if len(found) == 1 else None


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
        if s.get("ipa"):
            v = {"ipa": s["ipa"], "tags": list(s.get("tags") or [])}
            if v not in out:
                out.append(v)
    return out


def parse_entries(jsonl_lines: Iterable[str]) -> Iterator[dict]:
    for i, line in enumerate(jsonl_lines):
        line = line.strip()
        if not line:
            continue
        entry = json.loads(line)
        if entry.get("lang_code") != "de":
            continue
        pos = POS.get(entry.get("pos", ""))
        if not pos:
            continue
        senses = entry.get("senses") or []
        if senses and all(s.get("form_of") or "form-of" in (s.get("tags") or []) for s in senses) and pos != "det":
            continue
        yield {"id": i, "headword": unicodedata.normalize("NFC", entry["word"]), "pos": pos,
               "gender": _gender_of(entry) if pos == "noun" else None, "gloss_en": _gloss(entry),
               "ipa": _ipa(entry), "forms": entry.get("forms") or []}


def _picked(tags, table):
    return [v for k, v in table.items() if k in tags]


def _mood_tense(tags: set[str]) -> tuple[str, str] | None:
    if "imperative" in tags:
        return "x", "imp"
    if "subjunctive-ii" in tags:
        return "x", "sub2"
    if "subjunctive-i" in tags:
        return "x", "sub1"
    if "preterite" in tags or "past" in tags:
        return "pret", "ind"
    if "present" in tags or "indicative" in tags:
        return "pres", "ind"
    return None


_SIG = ("first-person", "second-person", "third-person", "singular", "plural", "masculine", "feminine", "neuter")


def _sig(tags) -> tuple:
    return tuple(t for t in _SIG if t in tags)


def _own_rows(entry: dict) -> list[dict] | None:
    """Pronoun and article pages repeat a whole shared table. A personal pronoun keeps only the rows of its
    own person/number/gender (those of its nominative row); an article page keeps the table only when it is
    the table's own page (its masculine nominative singular row is the headword: der, ein, mein, dieser)."""
    forms = entry["forms"]
    if entry["pos"] == "pron":
        sigs = {_sig(f.get("tags") or []) for f in forms
                if f.get("form") == entry["headword"] and "nominative" in (f.get("tags") or [])}
        if any("personal" in (f.get("tags") or []) for f in forms):
            # the shared personal-pronoun table: only this pronoun's own rows (none when it has no row: Du)
            return [f for f in forms if "table-tags" in (f.get("tags") or []) or (sigs and _sig(f.get("tags") or []) in sigs)]
    if entry["pos"] == "det":
        head = next((f.get("form") for f in forms if {"masculine", "nominative", "singular"} <= set(f.get("tags") or [])), None)
        if head is not None and head != entry["headword"]:
            return None
    return forms


def analyses_of(entry: dict) -> list[tuple[str, dict]]:
    pos = entry["pos"]
    head = entry["headword"]
    if pos in UNINFLECTED:
        if pos == "prep":
            return [(head, {"pos": "prep", "governs": g}) for g in GOVERNMENT.get(head, ["x"])]
        if pos == "adv":
            return [(head, {"pos": "adv", "degree": "pos"})]
        return [(head, {"pos": pos})]
    out: list[tuple[str, dict]] = []
    forms = _own_rows(entry)
    if forms is None:
        return []                            # an article page whose table belongs to der/ein
    for f in forms:
        tags = set(f.get("tags") or [])
        form = unicodedata.normalize("NFC", f.get("form", "")).strip()
        if not form or tags & SKIP_TAGS:
            continue
        if "includes-article" in tags:
            if pos != "adj":
                continue
            form = form.split()[-1]          # dem guten → guten
        if not _WORD.match(form):
            continue                         # multiword cells (sah an, dass ich ansah) are syntax
        if pos == "noun" and form[0].islower():
            continue                         # German nouns are capitalised: es as the plural of the letter e is noise
        if pos == "verb":
            if "participle" in tags:
                out.append((form, {"pos": "verb", "person": "0", "number": "x", "tense": "x",
                                   "mood": "ppl1" if "present" in tags else "ppl2"}))
                continue
            if "infinitive" in tags:
                out.append((form, {"pos": "verb", "person": "0", "number": "x", "tense": "x", "mood": "inf"}))
                continue
            persons, numbers, mt = _picked(tags, PERSONS), _picked(tags, NUMBERS), _mood_tense(tags)
            if not persons or not numbers or not mt:
                continue
            for p, n in product(persons, numbers):
                out.append((form, {"pos": "verb", "person": p, "number": n, "tense": mt[0], "mood": mt[1]}))
            continue
        degree = "super" if "superlative" in tags else "comp" if "comparative" in tags else "pos"
        if pos == "adj" and "predicative" in tags:
            out.append((form, {"pos": "adj", "case": "x", "number": "x", "gender": "x", "infl": "x", "degree": degree}))
            continue
        cases, numbers = _picked(tags, CASES), _picked(tags, NUMBERS)
        if pos == "adj" and degree != "pos" and not cases:
            out.append((form, {"pos": "adj", "case": "x", "number": "x", "gender": "x", "infl": "x", "degree": degree}))
            continue
        if not cases or not numbers:
            continue
        genders = _picked(tags, GENDERS) or ([entry["gender"]] if entry.get("gender") and pos == "noun" else ["x"])
        for c, n, g in product(cases, numbers, genders):
            if n == "pl" and pos != "noun":
                g = "x"
            a = {"pos": pos, "case": c, "number": n, "gender": g}
            if pos == "adj":
                a["infl"] = (_picked(tags, INFL) or ["x"])[0]
                a["degree"] = degree
            out.append((form, a))
    if not out:
        if pos == "noun":
            out.append((head, {"pos": "noun", "case": "nom", "number": "sg", "gender": entry.get("gender") or "x"}))
        elif pos == "adj":
            out.append((head, {"pos": "adj", "case": "x", "number": "x", "gender": "x", "infl": "x", "degree": "pos"}))
        elif pos == "verb":
            out.append((head, {"pos": "verb", "person": "0", "number": "x", "tense": "x", "mood": "inf"}))
        else:
            out.append((head, {"pos": pos, "case": "x", "number": "x", "gender": "x"}))
    return out


# contractions are form-of pages in the data (im = in dem); they are prepositions here
CONTRACTIONS = {k: v for k, v in GOVERNMENT.items() if k in (
    "am", "im", "beim", "vom", "zum", "zur", "hinterm", "überm", "unterm", "vorm",
    "ans", "ins", "aufs", "durchs", "fürs", "ums", "übers", "unters", "vors", "hinters")}
CONTRACTION_ID_BASE = 10_000_000


def contraction_entries() -> list[dict]:
    return [{"id": CONTRACTION_ID_BASE + i, "headword": w, "pos": "prep", "gender": None,
             "gloss_en": f"contraction of a preposition and the article ({w})", "ipa": [], "forms": []}
            for i, w in enumerate(sorted(CONTRACTIONS))]


def build_index(entries: Iterable[dict]) -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}
    seen: dict[str, set] = {}
    for e in [*entries, *contraction_entries()]:
        for form, a in analyses_of(e):
            if not _WORD.match(form):
                continue                     # e/a, phrases, punctuation: not a word to look up
            sig = tuple(sorted(a.items())) + (e["id"],)
            if sig in seen.setdefault(form, set()):
                continue
            seen[form].add(sig)
            index.setdefault(form, []).append({**a, "lemma": e["id"]})
    return index
