"""Parse Whitaker's DICTLINE.GEN into typed lemma records.

Column spans and code vocabularies are the ones measured in docs/DATA.md.
Nothing is guessed: an unknown code becomes "X" (age, freq) or None, and an
unparseable line raises ValueError naming the line.
"""
from __future__ import annotations

import dataclasses
from dataclasses import dataclass
from typing import Iterable

from casus_build.normalize import normalize_form

_STEM_SPANS = ((0, 19), (19, 38), (38, 57), (57, 76))
_POS_SPAN = (76, 83)
_CODES_SPAN = (83, 100)
_AGE_COL, _FREQ_COL, _GLOSS_COL = 100, 106, 110
_ABSENT_STEM = "zzz"   # no such stem
_EMPTY_STEM = "."      # a stem that is the empty string (sum: `s . fu fut`, so est = "" + est)

_POS = {
    "N": "noun",
    "ADJ": "adj",
    "V": "verb",
    "PRON": "pron",
    "PACK": "pack",  # qu- words with a tackon baked in (quicumque); not expanded until ADDONS.LAT is
    "ADV": "adv",
    "PREP": "prep",
    "CONJ": "conj",
    "INTERJ": "interj",
    "NUM": "num",
}
_GENDER = {"M": "m", "F": "f", "N": "n", "C": "c"}
_KIND = {"X": "x", "TRANS": "trans", "INTRANS": "intrans", "DEP": "dep", "SEMIDEP": "semidep",
         "IMPERS": "impers", "DAT": "dat", "ABL": "abl", "TO_BEING": "to_being", "PERFDEF": "perfdef"}
_DEGREE = {"POS": "pos", "COMP": "comp", "SUPER": "super", "X": "x"}
_CASE = {"NOM": "nom", "VOC": "voc", "GEN": "gen", "LOC": "loc", "DAT": "dat", "ABL": "abl", "ACC": "acc"}


@dataclass(frozen=True)
class Lemma:
    id: str                 # stable: f"{stems[0]}:{pos}:{index}"
    stems: tuple[str | None, ...]  # normalised; None = no such stem (zzz), "" = a real empty stem (sum's "."); trailing absent stems dropped
    pos: str                # "noun" | "adj" | "verb" | "pron" | "pack" | "adv" | "prep" | "conj" | "interj" | "num"
    decl: int | None        # Whitaker's first class number, for every inflecting pos (verbs too)
    variant: int | None     # Whitaker's variant number within the class
    conj: str | None        # "1" | "2" | "3" | "3-io" | "4" | "5".."9" for verbs
    gender: str | None      # "m" | "f" | "n" | "c" — nouns only
    age: str                # "A" archaic ... "H" modern, "X" unknown
    freq: str               # "A" very frequent ... "F", "I", "N", "X" unknown
    gloss_en: str
    governs: str | None = None  # prepositions: the case governed
    kind: str | None = None     # verbs: "x" | "trans" | "intrans" | "dep" | "semidep" | "impers" | "to_being" ...
    degree: str | None = None   # adjectives and adverbs: "pos" | "comp" | "super" | "x" (fully compared, one stem per degree)


def parse_dictline(lines: Iterable[str]) -> list[Lemma]:
    return [_parse_line(line, i) for i, line in enumerate(lines)]


def merge_continuations(lemmas: Iterable[Lemma]) -> list[Lemma]:
    """Fold a `|`-continuation line's gloss into the entry above it.

    DICTLINE repeats the stems and codes of an entry whose gloss runs over, and
    marks the extra line with a leading `|` in the gloss column. Kept separate
    by parse_dictline so that every input line maps to one record; merged here
    before expansion so that one word does not become three lemma ids.
    """
    out: list[Lemma] = []
    for lemma in lemmas:
        if out and lemma.gloss_en.startswith("|") and _same_entry(out[-1], lemma):
            prev = out[-1]
            extra = lemma.gloss_en.lstrip("|").strip()
            out[-1] = dataclasses.replace(prev, gloss_en=f"{prev.gloss_en} {extra}".strip())
        else:
            out.append(lemma)
    return out


def _same_entry(a: Lemma, b: Lemma) -> bool:
    return (a.stems, a.pos, a.decl, a.variant, a.gender, a.governs, a.degree) == (
        b.stems, b.pos, b.decl, b.variant, b.gender, b.governs, b.degree
    )


def _parse_line(line: str, index: int) -> Lemma:
    if len(line) < _GLOSS_COL:
        raise ValueError(f"DICTLINE line {index} too short to parse: {line!r}")
    pos_code = line[_POS_SPAN[0]:_POS_SPAN[1]].strip()
    if pos_code not in _POS:
        raise ValueError(f"DICTLINE line {index} has unknown part of speech {pos_code!r}: {line!r}")
    pos = _POS[pos_code]
    stems = _stems(line)
    codes = line[_CODES_SPAN[0]:_CODES_SPAN[1]].split()

    decl = variant = None
    conj = gender = governs = None
    if pos_code in ("N", "ADJ", "V", "PRON", "PACK", "NUM"):
        decl, variant = _int(codes[0]), _int(codes[1])
    if pos_code == "N":
        gender = _GENDER.get(codes[2])
    kind = None
    if pos_code == "V":
        conj = _conj_label(decl, variant, stems)
        kind = _KIND.get(codes[2], "x") if len(codes) > 2 else "x"
    if pos_code == "PREP":
        governs = _CASE.get(codes[0]) if codes else None
    degree = None
    if pos_code == "ADJ":
        degree = _DEGREE.get(codes[2])
    if pos_code == "ADV":
        degree = _DEGREE.get(codes[0]) if codes else None

    return Lemma(
        id=f"{stems[0]}:{pos}:{index}",
        stems=stems,
        pos=pos,
        decl=decl,
        variant=variant,
        conj=conj,
        gender=gender,
        age=_code(line[_AGE_COL]),
        freq=_code(line[_FREQ_COL]),
        gloss_en=line[_GLOSS_COL:].strip(),
        governs=governs,
        kind=kind,
        degree=degree,
    )


def _stems(line: str) -> tuple[str, ...]:
    raw = [line[a:b].strip() for a, b in _STEM_SPANS]
    stems: list[str | None] = []
    for s in raw:
        if s == _ABSENT_STEM or s == "":
            stems.append(None)
        elif s == _EMPTY_STEM:
            stems.append("")
        else:
            stems.append(normalize_form(s))
    while len(stems) > 1 and stems[-1] is None:
        stems.pop()
    return tuple(stems)


def _conj_label(decl: int | None, variant: int | None, stems: tuple[str, ...]) -> str | None:
    """Whitaker's numbering, measured in docs/DATA.md: V 3 4 is the 4th conjugation,
    and a 3rd-conjugation verb whose first stem ends in i (capi/cap) is the -io type."""
    if decl is None:
        return None
    if decl == 3 and variant == 4:
        return "4"
    if decl == 3:
        io = len(stems) > 1 and (stems[0] or "").endswith("i") and not (stems[1] or "").endswith("i")
        return "3-io" if io else "3"
    return str(decl)


def _int(code: str) -> int | None:
    return int(code) if code.isdigit() else None


def _code(ch: str) -> str:
    return ch if ch.strip() else "X"
