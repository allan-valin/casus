"""Compact analysis codes for Chinese (format 2): part of speech only; the pinyin rides on the row as ~reading."""
_POS = {"noun": "n", "verb": "v", "adj": "a", "adv": "d", "pron": "o", "conj": "c", "prep": "r", "particle": "k",
        "classifier": "l", "num": "m", "interj": "j", "char": "h"}
_LAYOUT = {pos: () for pos in _POS}
_POS_BACK = {v: k for k, v in _POS.items()}


def encode_analysis(a: dict) -> str:
    return _POS[a["pos"]]


def decode_analysis(code: str, lemma: str) -> dict:
    return {"lemma": lemma, "pos": _POS_BACK[code[0]]}


CODES_JSON = {"POS": {v: k for k, v in _POS.items()}, "TABLES": {}, "LAYOUT": {pos: [] for pos in _POS}}
