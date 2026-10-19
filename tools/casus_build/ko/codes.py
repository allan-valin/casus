"""Compact analysis codes for Korean (format 2): part of speech and, for verbs and adjectives, the form (speech
level, tense, sentence type). Mirrored by src/lang/ko/codes.js (generated from CODES_JSON)."""
import string

_POS = {"noun": "n", "verb": "v", "adj": "a", "adv": "d", "pron": "o", "num": "m", "det": "t", "interj": "j", "particle": "k"}
_NAMES = ["dict", "inf", "seq", "if"] + [f"{lvl}{past}{kind}" for lvl in ("hamnida", "haeyo", "hae", "handa")
                                          for past in ("", " past") for kind in ("", " q", " imp", " let")]
_FORM = {name: ch for name, ch in zip(_NAMES, string.ascii_letters + string.digits)}
_FORM["x"] = "_"
_FORM[None] = "_"
_LAYOUT = {pos: ((("form", _FORM),) if pos in ("verb", "adj") else ()) for pos in _POS}
_POS_BACK = {v: k for k, v in _POS.items()}
_FORM_BACK = {v: k for k, v in _FORM.items() if k is not None}


def encode_analysis(a: dict) -> str:
    return _POS[a["pos"]] + "".join(table[a.get(name)] for name, table in _LAYOUT[a["pos"]])


def decode_analysis(code: str, lemma: str) -> dict:
    pos = _POS_BACK[code[0]]
    out = {"lemma": lemma, "pos": pos}
    if _LAYOUT[pos] and _FORM_BACK[code[1]] != "x":
        out["form"] = _FORM_BACK[code[1]]
    return out


CODES_JSON = {"POS": {v: k for k, v in _POS.items()}, "TABLES": {"form": {v: k for k, v in _FORM.items() if k is not None}},
              "LAYOUT": {pos: [name for name, _t in layout] for pos, layout in _LAYOUT.items()}}
