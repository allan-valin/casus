"""Parse Whitaker's UNIQUES.LAT: forms his rules cannot build (vult, memento, quisquis, dii).

Three lines per record — the form, a code line, the gloss. The code line is a
DICTLINE part of speech and class followed by the inflection features
(case/number/gender for nominals, tense/voice/mood/person/number for verbs),
a kind, and the usual age/area/geo/freq/source. Each becomes one synthetic
lemma of its own plus one analysis keyed by the normalised form.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from casus_build.dictline import Lemma, _DEGREE, _GENDER, _KIND
from casus_build.inflects import _VALUES
from casus_build.normalize import normalize_form

UNIQUE_INDEX_OFFSET = 100000

_POS = {"N": "noun", "ADJ": "adj", "V": "verb", "PRON": "pron", "NUM": "num", "ADV": "adv",
        "PREP": "prep", "CONJ": "conj", "INTERJ": "interj"}


@dataclass(frozen=True)
class Unique:
    form: str        # normalised
    lemma: Lemma
    analysis: dict


def parse_uniques(lines: Iterable[str]) -> list[Unique]:
    rows = [l for l in lines if l.strip()]
    if len(rows) % 3:
        raise ValueError("UNIQUES.LAT is not made of three-line records")
    out = []
    for n in range(0, len(rows), 3):
        out.append(_record(rows[n], rows[n + 1], rows[n + 2], n // 3))
    return out


def _record(form_line: str, code_line: str, gloss: str, n: int) -> Unique:
    form = normalize_form(form_line.strip())
    fields = code_line.split()
    pos_code = fields[0]
    if pos_code not in _POS:
        raise ValueError(f"UNIQUES record {n} has unknown part of speech {pos_code!r}: {code_line!r}")
    pos = _POS[pos_code]
    age, freq = fields[-5], fields[-2]
    body = fields[1:-5]
    decl = variant = None
    conj = gender = kind = degree = None
    features: dict[str, str] = {}
    if pos_code == "V":
        decl, variant = int(body[0]), int(body[1])
        tense, voice, mood, person, number = body[2:7]
        kind = _KIND.get(body[7], "x") if len(body) > 7 else "x"
        conj = str(decl) if decl else None  # V 0 0: no conjugation to speak of
        features = {"person": person, "number": _VALUES["number"][number], "tense": _VALUES["tense"][tense],
                    "mood": _VALUES["mood"][mood], "voice": _VALUES["voice"][voice], "conj": conj}
    elif pos_code in ("N", "ADJ", "PRON", "NUM"):
        decl, variant = int(body[0]), int(body[1])
        case, number, gen = body[2:5]
        features = {"case": _VALUES["case"][case], "number": _VALUES["number"][number], "gender": _GENDER.get(gen, "x")}
        if pos_code == "N":
            gender = _GENDER.get(gen)
        if pos_code == "ADJ":
            degree = _DEGREE.get(body[5], "x") if len(body) > 5 else "x"
            features["degree"] = degree
    index = UNIQUE_INDEX_OFFSET + n
    lemma = Lemma(
        id=f"{form}:{pos}:{index}", stems=(form,), pos=pos, decl=decl, variant=variant, conj=conj,
        gender=gender, age=age, freq=freq, gloss_en=gloss.strip(), kind=kind, degree=degree,
    )
    return Unique(form=form, lemma=lemma, analysis={"lemma": lemma.id, "pos": pos, **features})
