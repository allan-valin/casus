"""Compact analysis codes for Ancient Greek (format 2, Greek layout), mirrored by
src/lang/grc/inventory.js through CODES_JSON (written to data/grc/codes.json by build_lang.py).
One letter per channel, as Latin's; the layout per part of speech says which channels follow."""
_POS = {"noun": "n", "adj": "a", "verb": "v", "vpar": "p", "pron": "o", "det": "t", "num": "m",
        "adv": "d", "prep": "r", "conj": "c", "particle": "k", "interj": "j"}
_CASE = {"nom": "n", "voc": "v", "gen": "g", "dat": "d", "acc": "a", "x": "x", None: "x"}
_NUMBER = {"sg": "s", "du": "d", "pl": "p", "x": "x", None: "x"}
_GENDER = {"m": "m", "f": "f", "n": "n", "c": "c", "x": "x", None: "x"}
_DEGREE = {"pos": "p", "comp": "c", "super": "s", "x": "x", None: "x"}
_TENSE = {"pres": "p", "impf": "i", "fut": "f", "aor": "a", "perf": "r", "plup": "l", "futp": "u", "x": "x", None: "x"}
_MOOD = {"ind": "i", "sub": "s", "opt": "o", "imp": "m", "inf": "n", "x": "x", None: "x"}
_VOICE = {"act": "a", "mid": "m", "pass": "p", "mp": "e", "x": "x", None: "x"}
_PERSON = {"0": "0", "1": "1", "2": "2", "3": "3", None: "0"}

_NOMINAL = (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER))
_LAYOUT = {
    "noun": _NOMINAL, "pron": _NOMINAL, "det": _NOMINAL, "num": _NOMINAL,
    "adj": _NOMINAL + (("degree", _DEGREE),),
    "verb": (("person", _PERSON), ("number", _NUMBER), ("tense", _TENSE), ("mood", _MOOD), ("voice", _VOICE)),
    "vpar": _NOMINAL + (("tense", _TENSE), ("voice", _VOICE)),
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


# the same tables for the browser: letter -> value per channel, and the layout per pos
CODES_JSON = {
    "POS": {v: k for k, v in _POS.items()},
    "TABLES": {name: {v: k for k, v in table.items() if k is not None} for name, table in
               (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER), ("degree", _DEGREE), ("tense", _TENSE),
                ("mood", _MOOD), ("voice", _VOICE), ("person", _PERSON), ("governs", _CASE))},
    "LAYOUT": {pos: [name for name, _t in layout] for pos, layout in _LAYOUT.items()},
}
