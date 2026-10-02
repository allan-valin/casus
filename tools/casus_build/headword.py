"""Derive the dictionary headword and citation form of a lemma from its rules.

Whitaker stores stems, not headwords; the headword is the lead form the rules
build (nom sg for a noun, 1 sg present for a verb), and the citation form adds
the ending a dictionary prints beside it. A lemma no rule serves keeps its
first stem as the headword, so every lemma has one.
"""
from __future__ import annotations

from casus_build.dictline import Lemma
from casus_build.inflects import Inflection
from casus_build.expand import _class_matches, _gender_fits, _stem
from casus_build.normalize import normalize_form


def lemma_record(lemma: Lemma, rules: list[Inflection]) -> dict:
    headword, dict_form = _citation(lemma, rules)
    record = {
        "headword": headword,
        "dict_form": dict_form,
        "pos": lemma.pos,
        "decl": lemma.decl,
        "variant": lemma.variant,
        "conj": lemma.conj,
        "gender": lemma.gender,
        "age": lemma.age,
        "freq": lemma.freq,
        "governs": lemma.governs,
    }
    return {k: v for k, v in record.items() if v is not None}


def _citation(lemma: Lemma, rules: list[Inflection]) -> tuple[str, str]:
    own = [r for r in rules if _class_matches(lemma, r) and _gender_fits(lemma, r)]
    fallback = lemma.stems[0] or ""
    if lemma.pos == "noun":
        head = _form(lemma, own, "noun", case="nom", number="sg")
        gen = _ending(own, "noun", case="gen", number="sg")
        if head is None:
            return fallback, fallback
        gender = f" {lemma.gender}." if lemma.gender else ""
        return head, f"{head}, -{gen}{gender}" if gen is not None else head
    if lemma.pos == "adj":
        head = _form(lemma, own, "adj", case="nom", number="sg", degree="pos", gender=("m", "c", "x"))
        if head is None:
            return fallback, fallback
        f = _ending(own, "adj", case="nom", number="sg", degree="pos", gender=("f", "c", "x"))
        n = _ending(own, "adj", case="nom", number="sg", degree="pos", gender=("n", "x"))
        m = _ending(own, "adj", case="nom", number="sg", degree="pos", gender=("m", "c", "x"))
        if f is not None and n is not None and not (f == m == n):
            return head, f"{head}, -{f}, -{n}"
        gen = _ending(own, "adj", case="gen", number="sg", degree="pos")
        return head, f"{head}, -{gen}" if gen is not None else head
    if lemma.pos == "verb":
        head = _form(lemma, own, "verb", person="1", number="sg", tense="pres", mood="ind", voice="act")
        if head is None:
            return fallback, fallback
        inf = _ending(own, "verb", person="0", tense="pres", mood="inf", voice="act")
        return head, f"{head}, -{inf}" if inf is not None else head
    return fallback, fallback


def _candidates(rules, pos, **want):
    out = []
    for r in rules:
        if r.pos != pos:
            continue
        ok = True
        for k, v in want.items():
            have = r.features.get(k)
            if have is None or (have not in v if isinstance(v, tuple) else have != v):
                ok = False
                break
        if ok:
            out.append(r)
    # the plain, frequent ending first; rare and dated variants after it
    out.sort(key=lambda r: (r.freq != "A", r.age != "X"))
    return out


def _form(lemma, rules, pos, **want):
    for r in _candidates(rules, pos, **want):
        stem = _stem(lemma, r.stem_key)
        if stem is not None:
            return normalize_form(stem + r.ending)
    return None


def _ending(rules, pos, **want):
    for r in _candidates(rules, pos, **want):
        return r.ending
    return None
