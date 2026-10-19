"""Compact analysis codes for Macedonian (format 2). The nominal 'case' channel holds definiteness, the grammar a learner
of Macedonian must see: indefinite, definite (-от), proximal (-ов), distal (-он), and the vocative."""
_POS = {"noun": "n", "adj": "a", "verb": "v", "pron": "o", "det": "t", "num": "m", "adv": "d", "prep": "r", "conj": "c", "particle": "k", "interj": "j"}
_CASE = {"indef": "i", "def": "d", "prox": "p", "dist": "s", "voc": "v", "x": "x", None: "x"}
_NUMBER = {"sg": "s", "pl": "p", "x": "x", None: "x"}
_GENDER = {"m": "m", "f": "f", "n": "n", "x": "x", None: "x"}
_PERSON = {"1": "1", "2": "2", "3": "3", "x": "x", None: "x"}
_TENSE = {"pres": "p", "impf": "i", "aor": "a", "imp": "m", "lpart": "l", "x": "x", None: "x"}
_ASPECT = {"impf": "i", "pf": "p", "x": "x", None: "x"}
_NOMINAL = (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER))
_LAYOUT = {"noun": _NOMINAL, "adj": _NOMINAL, "pron": _NOMINAL, "det": _NOMINAL, "num": _NOMINAL,
           "verb": (("person", _PERSON), ("number", _NUMBER), ("gender", _GENDER), ("tense", _TENSE), ("aspect", _ASPECT)),
           "adv": (), "prep": (), "conj": (), "particle": (), "interj": ()}
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


CODES_JSON = {"POS": {v: k for k, v in _POS.items()},
              "TABLES": {name: {v: k for k, v in table.items() if k is not None} for name, table in
                         (("case", _CASE), ("number", _NUMBER), ("gender", _GENDER), ("person", _PERSON), ("tense", _TENSE), ("aspect", _ASPECT))},
              "LAYOUT": {pos: [name for name, _t in layout] for pos, layout in _LAYOUT.items()}}
