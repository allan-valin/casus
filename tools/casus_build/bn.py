"""Bengali (2026-10-21; docs/languages/bn.md). Most nouns come without a table; the case endings are regular, so they are
generated from the word: objective -কে, genitive -এর / -র, locative -এ / -তে (-য়), and the classifiers -টা / -টি
(the one), -গুলো / -গুলি (the ones), -রা / -এরা (people), each with its case endings."""
from __future__ import annotations

_VOWEL_SIGNS = set("ািীুূৃেৈোৌ") | set("অআইঈউঊঋএঐওঔ")


def _vowel_final(w: str) -> bool:
    return bool(w) and w[-1] in _VOWEL_SIGNS


def _cases(stem: str, number: str, out: list) -> None:
    vf = _vowel_final(stem)
    out.append((stem, {"pos": "noun", "case": "nom", "number": number}))
    out.append((stem + "কে", {"pos": "noun", "case": "obj", "number": number}))
    out.append((stem + ("র" if vf else "ের"), {"pos": "noun", "case": "gen", "number": number}))
    out.append((stem + ("তে" if vf else "ে"), {"pos": "noun", "case": "loc", "number": number}))
    if vf:
        out.append((stem + "য়", {"pos": "noun", "case": "loc", "number": number}))


def noun_forms(word: str) -> list[tuple[str, dict]]:
    out: list = []
    _cases(word, "sg", out)
    for cl in ("টা", "টি"):
        _cases(word + cl, "sg", out)
    for pl in ("গুলো", "গুলি"):
        _cases(word + pl, "pl", out)
    animate_pl = word + ("রা" if _vowel_final(word) else "েরা")
    out.append((animate_pl, {"pos": "noun", "case": "nom", "number": "pl"}))
    out.append((word + "দের", {"pos": "noun", "case": "gen", "number": "pl"}))
    out.append((word + "দেরকে", {"pos": "noun", "case": "obj", "number": "pl"}))
    return out
