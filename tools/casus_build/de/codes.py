"""Compact analysis codes for German (format 2, German layout), mirrored by src/lang/de/codes.js
through the fixture tests/fixtures/codes.de.json."""
_POS = {"noun": "n", "adj": "a", "verb": "v", "pron": "o", "det": "t", "num": "m",
        "adv": "d", "prep": "r", "conj": "c", "particle": "k", "interj": "j"}
_CASE = {"nom": "n", "gen": "g", "dat": "d", "acc": "a", "x": "x", None: "x"}
_NUMBER = {"sg": "s", "pl": "p", "x": "x", None: "x"}
_GENDER = {"m": "m", "f": "f", "n": "n", "x": "x", None: "x"}
_INFL = {"strong": "s", "weak": "w", "mixed": "m", "x": "x", None: "x"}
_DEGREE = {"pos": "p", "comp": "c", "super": "s", "x": "x", None: "x"}
_TENSE = {"pres": "p", "pret": "r", "x": "x", None: "x"}
_MOOD = {"ind": "i", "sub1": "1", "sub2": "2", "imp": "m", "inf": "n", "ppl1": "a", "ppl2": "b", "x": "x", None: "x"}
_PERSON = {"0": "0", "1": "1", "2": "2", "3": "3", None: "0"}

_NOMINAL = (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER))
_LAYOUT = {
    "noun": _NOMINAL, "pron": _NOMINAL, "det": _NOMINAL, "num": _NOMINAL,
    "adj": _NOMINAL + (("infl", _INFL), ("degree", _DEGREE)),
    "verb": (("person", _PERSON), ("number", _NUMBER), ("tense", _TENSE), ("mood", _MOOD)),
    "adv": (("degree", _DEGREE),),
    "prep": (("governs", _CASE),),
    "conj": (), "particle": (), "interj": (),
}
_POS_BACK = {v: k for k, v in _POS.items()}
_BACK = {name: {v: k for k, v in table.items() if k is not None} for layout in _LAYOUT.values() for name, table in layout}


def encode_analysis(a: dict) -> str:
    pos = a["pos"]
    return _POS[pos] + "".join(table[a.get(name)] for name, table in _LAYOUT[pos])


def decode_analysis(code: str, lemma: str) -> dict:
    pos = _POS_BACK[code[0]]
    out = {"lemma": lemma, "pos": pos}
    for (name, _t), ch in zip(_LAYOUT[pos], code[1:]):
        out[name] = _BACK[name][ch]
    return out


CODES_JSON = {
    "POS": {v: k for k, v in _POS.items()},
    "TABLES": {name: {v: k for k, v in table.items() if k is not None} for name, table in
               (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER), ("infl", _INFL), ("degree", _DEGREE),
                ("tense", _TENSE), ("mood", _MOOD), ("person", _PERSON), ("governs", _CASE))},
    "LAYOUT": {pos: [name for name, _t in layout] for pos, layout in _LAYOUT.items()},
}
