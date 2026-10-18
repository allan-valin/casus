"""Compact analysis codes for Japanese (format 2): part of speech, and for verbs and adjectives the form.
Mirrored by src/lang/ja/codes.js (generated from CODES_JSON)."""
_POS = {"noun": "n", "verb": "v", "adj": "a", "adv": "d", "pron": "o", "particle": "k", "conj": "c", "interj": "j",
        "suffix": "s", "prefix": "p", "counter": "u", "num": "m", "det": "t", "aux": "x"}
_FORM = {"dict": "d", "neg": "n", "past": "p", "pastneg": "q", "te": "t", "polite": "m", "politeneg": "N", "politepast": "P",
         "politepastneg": "Q", "politevol": "V", "stem": "s", "vol": "v", "pot": "o", "pass": "r", "caus": "c", "cond": "b",
         "tara": "T", "imp": "i", "des": "w", "desneg": "W", "despast": "D", "negte": "e", "negcond": "B", "zu": "z",
         "adv": "a", "attr": "A", "noun": "S", "seem": "y", "copula": "C", "kana": "k", "x": "_", None: "_"}
_LAYOUT = {pos: (("form", _FORM),) for pos in _POS}       # nouns too: "kana" marks a kanji word met in kana
_POS_BACK = {v: k for k, v in _POS.items()}
_FORM_BACK = {v: k for k, v in _FORM.items() if k is not None}


def encode_analysis(a: dict) -> str:
    return _POS[a["pos"]] + "".join(table[a.get(name)] for name, table in _LAYOUT[a["pos"]])


def decode_analysis(code: str, lemma: str) -> dict:
    pos = _POS_BACK[code[0]]
    out = {"lemma": lemma, "pos": pos}
    form = _FORM_BACK[code[1]]
    if form != "x":
        out["form"] = form
    return out


CODES_JSON = {
    "POS": {v: k for k, v in _POS.items()},
    "TABLES": {"form": {v: k for k, v in _FORM.items() if k is not None}},
    "LAYOUT": {pos: [name for name, _t in layout] for pos, layout in _LAYOUT.items()},
}
