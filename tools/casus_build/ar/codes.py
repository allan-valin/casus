"""Compact analysis codes for Arabic (format 2). Mirrored by src/lang/ar/codes.js (generated from CODES_JSON)."""
_POS = {"noun": "n", "adj": "a", "verb": "v", "pron": "o", "num": "m", "adv": "d", "prep": "r", "conj": "c", "particle": "k",
        "interj": "j", "ppl": "p"}
_CASE = {"nom": "n", "acc": "a", "gen": "g", "x": "x", None: "x"}
_NUMBER = {"sg": "s", "du": "d", "pl": "p", "x": "x", None: "x"}
_GENDER = {"m": "m", "f": "f", "x": "x", None: "x"}
_STATE = {"def": "d", "indef": "i", "cons": "c", "x": "x", None: "x"}
_PERSON = {"1": "1", "2": "2", "3": "3", "x": "x", None: "x"}
_TENSE = {"past": "p", "npast": "n", "x": "x", None: "x"}
_MOOD = {"ind": "i", "subj": "s", "juss": "j", "imp": "m", "x": "x", None: "x"}
_VOICE = {"act": "a", "pass": "p", "x": "x", None: "x"}
_NOMINAL = (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER), ("state", _STATE))
_LAYOUT = {"noun": _NOMINAL, "adj": _NOMINAL, "num": _NOMINAL, "pron": _NOMINAL, "ppl": _NOMINAL,
           "verb": (("person", _PERSON), ("number", _NUMBER), ("gender", _GENDER), ("tense", _TENSE), ("mood", _MOOD), ("voice", _VOICE)),
           "adv": (), "prep": (("governs", _CASE),), "conj": (), "particle": (), "interj": ()}
_POS_BACK = {v: k for k, v in _POS.items()}
_BACK = {name: {v: k for k, v in table.items() if k is not None} for layout in _LAYOUT.values() for name, table in layout}


def encode_analysis(a: dict) -> str:
    return _POS[a["pos"]] + "".join(table[a.get(name)] for name, table in _LAYOUT[a["pos"]])


def decode_analysis(code: str, lemma: str) -> dict:
    pos = _POS_BACK[code[0]]
    out = {"lemma": lemma, "pos": pos}
    for (name, _t), ch in zip(_LAYOUT[pos], code[1:]):
        v = _BACK[name][ch]
        if v != "x":
            out[name] = v
    return out


CODES_JSON = {
    "POS": {v: k for k, v in _POS.items()},
    "TABLES": {name: {v: k for k, v in table.items() if k is not None} for name, table in
               (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER), ("state", _STATE), ("person", _PERSON),
                ("tense", _TENSE), ("mood", _MOOD), ("voice", _VOICE), ("governs", _CASE))},
    "LAYOUT": {pos: [name for name, _t in layout] for pos, layout in _LAYOUT.items()},
}
