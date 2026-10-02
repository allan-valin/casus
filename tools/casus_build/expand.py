"""Expand lemmas x inflection rules into the form index.

Keys are normalised surface forms; values are every analysis that produces
that form. Syncretism must survive: `rosa` keeps nom/voc/abl sg. Identical
analyses of one form are deduplicated, analyses differing in any feature are
kept apart.
"""
from __future__ import annotations

from collections import defaultdict

from casus_build.dictline import Lemma
from casus_build.inflects import Inflection
from casus_build.normalize import normalize_form

Analysis = dict  # nominal: {"lemma","pos","case","number","gender"[,"degree"]}
                 # verb:    {"lemma","pos","person","number","tense","mood","voice","conj"}

# which rule parts of speech serve a lemma part of speech
_RULE_POS = {
    "noun": ("noun",),
    "adj": ("adj",),
    "verb": ("verb", "vpar", "supine"),
    "pron": ("pron",),
    "num": ("num",),
    "adv": ("adv",),
    "prep": ("prep",),
    "conj": ("conj",),
    "interj": ("interj",),
}


def expand(lemmas: list[Lemma], rules: list[Inflection]) -> dict[str, list[Analysis]]:
    by_pos: dict[str, list[Inflection]] = defaultdict(list)
    for rule in rules:
        by_pos[rule.pos].append(rule)

    index: dict[str, list[Analysis]] = defaultdict(list)
    seen: set[tuple[str, tuple]] = set()
    for lemma in lemmas:
        for rule_pos in _RULE_POS.get(lemma.pos, ()):
            for rule in by_pos[rule_pos]:
                if not _class_matches(lemma, rule) or not _gender_fits(lemma, rule):
                    continue
                if not _degree_fits(lemma, rule):
                    continue
                stem = _stem(lemma, _stem_key_for(lemma, rule))
                if stem is None:
                    continue
                form = normalize_form(stem + rule.ending)
                if not form:
                    continue
                analysis = _analysis(lemma, rule)
                fingerprint = (form, tuple(sorted(analysis.items())))
                if fingerprint in seen:
                    continue
                seen.add(fingerprint)
                index[form].append(analysis)
    return dict(index)


def _class_matches(lemma: Lemma, rule: Inflection) -> bool:
    """Variant 0 serves every variant of the class; class 0 serves every class."""
    if rule.decl is None:
        return lemma.decl is None
    if lemma.decl is None:
        return False
    if rule.decl == 0:
        return True
    if rule.decl != lemma.decl:
        return False
    return rule.variant in (0, lemma.variant)


def _gender_fits(lemma: Lemma, rule: Inflection) -> bool:
    """Nouns carry their own gender; a rule's gender must be equal, `x` (any) or
    `c` (common: m or f). Other parts of speech take the gender from the rule."""
    if lemma.gender is None:
        return True
    rg = rule.features.get("gender", "x")
    if rg in ("x", lemma.gender):
        return True
    return rg == "c" and lemma.gender in ("m", "f", "c")


_DEGREE_BY_STEM = {1: "pos", 2: "comp", 3: "super"}


def _degree_fits(lemma: Lemma, rule: Inflection) -> bool:
    """Whitaker's comparison code: a lemma marked X carries one stem per degree
    and takes every rule; POS/COMP/SUPER lemmas carry one stem and take only the
    rules of their own degree (a `COMP` adjective's single stem IS the comparative)."""
    if lemma.degree is None:
        return True
    rd = rule.features.get("degree", "x")
    if lemma.pos == "adv":
        # ADV X k 0 serves the three-stem adverbs (stem k is the degree);
        # ADV POS/COMP/SUPER 1 0 serve the one-stem ones of that degree.
        return rd == lemma.degree
    if lemma.degree == "x":
        return True
    return rd == lemma.degree or (lemma.degree == "pos" and rd == "x")


def _stem_key_for(lemma: Lemma, rule: Inflection) -> int:
    """A comparative- or superlative-only adjective keeps its one stem where the
    rule expects stem 3 or 4."""
    if lemma.pos == "adj" and lemma.degree in ("comp", "super"):
        return 1
    return rule.stem_key


def _stem(lemma: Lemma, stem_key: int) -> str | None:
    if stem_key < 1 or stem_key > len(lemma.stems):
        return None
    stem = lemma.stems[stem_key - 1]
    return stem or None


def _analysis(lemma: Lemma, rule: Inflection) -> Analysis:
    f = rule.features
    if rule.pos == "noun":
        return {"lemma": lemma.id, "pos": "noun", "case": f["case"], "number": f["number"],
                "gender": lemma.gender}
    if rule.pos == "adj":
        return {"lemma": lemma.id, "pos": "adj", "case": f["case"], "number": f["number"],
                "gender": f["gender"], "degree": f["degree"]}
    if rule.pos in ("pron", "num", "supine"):
        return {"lemma": lemma.id, "pos": rule.pos, "case": f["case"], "number": f["number"],
                "gender": f["gender"]}
    if rule.pos == "verb":
        return {"lemma": lemma.id, "pos": "verb", "person": f["person"], "number": f["number"],
                "tense": f["tense"], "mood": f["mood"], "voice": f["voice"], "conj": lemma.conj}
    if rule.pos == "vpar":
        return {"lemma": lemma.id, "pos": "vpar", "case": f["case"], "number": f["number"],
                "gender": f["gender"], "tense": f["tense"], "voice": f["voice"], "conj": lemma.conj}
    if rule.pos == "adv":
        degree = f["degree"]
        if degree == "x":  # fully compared adverb: the stem says which degree this is
            degree = _DEGREE_BY_STEM.get(rule.stem_key, "x")
        return {"lemma": lemma.id, "pos": "adv", "degree": degree}
    if rule.pos == "prep":
        return {"lemma": lemma.id, "pos": "prep", "governs": lemma.governs}
    return {"lemma": lemma.id, "pos": rule.pos}
