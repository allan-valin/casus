"""Parse Whitaker's INFLECTS.LAT into typed inflection rules.

Field shapes per part of speech are the ones measured in docs/DATA.md. Every
rule ends in `stem_key ending_length [ending] age freq`; the ending is absent
when its length is 0 and is represented here as "", never None.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from casus_build.normalize import normalize_form

# head fields after `pos`, before the common tail
_HEAD = {
    "N": ("decl", "variant", "case", "number", "gender"),
    "ADJ": ("decl", "variant", "case", "number", "gender", "degree"),
    "V": ("decl", "variant", "tense", "voice", "mood", "person", "number"),
    "VPAR": ("decl", "variant", "case", "number", "gender", "tense", "voice", "mood"),
    "SUPINE": ("decl", "variant", "case", "number", "gender"),
    "PRON": ("decl", "variant", "case", "number", "gender"),
    "NUM": ("decl", "variant", "case", "number", "gender", "sort"),
    "ADV": ("degree",),
    "PREP": ("governs",),
    "CONJ": (),
    "INTERJ": (),
}
_POS = {
    "N": "noun", "ADJ": "adj", "V": "verb", "VPAR": "vpar", "SUPINE": "supine",
    "PRON": "pron", "NUM": "num", "ADV": "adv", "PREP": "prep", "CONJ": "conj",
    "INTERJ": "interj",
}
_VALUES = {
    "case": {"NOM": "nom", "VOC": "voc", "GEN": "gen", "LOC": "loc", "DAT": "dat", "ABL": "abl", "ACC": "acc", "X": "x"},
    "governs": {"NOM": "nom", "VOC": "voc", "GEN": "gen", "LOC": "loc", "DAT": "dat", "ABL": "abl", "ACC": "acc", "X": "x"},
    "number": {"S": "sg", "P": "pl", "X": "x"},
    "gender": {"M": "m", "F": "f", "N": "n", "C": "c", "X": "x"},
    "degree": {"POS": "pos", "COMP": "comp", "SUPER": "super", "X": "x"},
    "tense": {"PRES": "pres", "IMPF": "impf", "FUT": "fut", "PERF": "perf", "PLUP": "plup", "FUTP": "futp", "X": "x"},
    "voice": {"ACTIVE": "act", "PASSIVE": "pass", "X": "x"},
    "mood": {"IND": "ind", "SUB": "sub", "IMP": "imp", "INF": "inf", "PPL": "ppl", "X": "x"},
    "sort": {"CARD": "card", "ORD": "ord", "DIST": "dist", "ADVERB": "adverb", "X": "x"},
}


@dataclass(frozen=True)
class Inflection:
    pos: str                # same vocabulary as Lemma.pos, plus "vpar" and "supine"
    decl: int | None        # Whitaker's class number; 0 = every class
    variant: int | None     # 0 = every variant of the class
    stem_key: int           # which of the lemma's stems this ending attaches to (1-4)
    ending: str             # normalised; "" for a bare stem
    age: str
    freq: str
    features: dict[str, str]  # nominal: case/number/gender[/degree]; verb: tense/voice/mood/person/number


def parse_inflects(lines: Iterable[str]) -> list[Inflection]:
    rules = []
    for i, raw in enumerate(lines):
        line = raw.split("--", 1)[0].strip()
        if not line:
            continue
        rules.append(_parse_rule(line, i, raw))
    return rules


def _parse_rule(line: str, index: int, raw: str) -> Inflection:
    fields = line.split()
    pos_code = fields[0]
    if pos_code not in _HEAD:
        raise ValueError(f"INFLECTS line {index} has unknown part of speech {pos_code!r}: {raw!r}")
    head_names = _HEAD[pos_code]
    head = fields[1:1 + len(head_names)]
    tail = fields[1 + len(head_names):]
    if len(head) != len(head_names) or len(tail) not in (4, 5):
        raise ValueError(f"INFLECTS line {index} has the wrong number of fields: {raw!r}")

    stem_key, length = int(tail[0]), int(tail[1])
    if length == 0:
        ending, age, freq = "", tail[2], tail[3]
        if len(tail) != 4:
            raise ValueError(f"INFLECTS line {index} has an ending of length 0 but an ending: {raw!r}")
    else:
        if len(tail) != 5:
            raise ValueError(f"INFLECTS line {index} promises an ending and has none: {raw!r}")
        ending, age, freq = normalize_form(tail[2]), tail[3], tail[4]
        if len(ending) != length:
            raise ValueError(f"INFLECTS line {index} ending {ending!r} is not {length} long: {raw!r}")

    decl = variant = None
    features: dict[str, str] = {}
    for name, value in zip(head_names, head):
        if name == "decl":
            decl = int(value)
        elif name == "variant":
            variant = int(value)
        elif name == "person":
            features[name] = value
        else:
            features[name] = _VALUES[name][value]
    return Inflection(
        pos=_POS[pos_code], decl=decl, variant=variant, stem_key=stem_key,
        ending=ending, age=age, freq=freq, features=features,
    )
