"""Lithuanian (2026-10-21; docs/languages/lt.md). Keys without tone marks (acute, grave, tilde, and the dot that keeps
an accented i dotted), the letters ą č ę ė į š ų ū ž kept: mirror of src/lang/lt/script.js.

Verbs: Wiktionary has full tables (53 cells, untagged) for ~700 verbs and only the principal parts — infinitive,
present 3rd, past 3rd — for the rest; every finite form follows from those three. The past frequentative is filed as
tense `impf` (habitual past)."""
from __future__ import annotations

import unicodedata

_TONES = {"̀", "́", "̃"}


def strip_lt(s: str) -> str:
    d = unicodedata.normalize("NFD", s.lower())
    out = []
    for c in d:
        if c in _TONES:
            continue
        if c == "̇" and out and out[-1] in ("i", "̨") and (len(out) < 2 or out[-1] == "i" or out[-2] == "i"):
            continue                       # i̇̃: the dot only kept the accented i dotted
        out.append(c)
    return unicodedata.normalize("NFC", "".join(out))


def _a(tense, mood, person, number):
    return {"pos": "verb", "tense": tense, "mood": mood, "person": person, "number": number}


def _rows(forms, tense, mood):
    """eight cells: 1sg 2sg 3 1pl 1pl(short) 2pl 2pl(short) 3"""
    f1, f2, f3, p1, p1s, p2, p2s = forms
    out = [(f1, _a(tense, mood, "1", "sg")), (f2, _a(tense, mood, "2", "sg")), (f3, _a(tense, mood, "3", "sg")), (f3, _a(tense, mood, "3", "pl")),
           (p1, _a(tense, mood, "1", "pl")), (p2, _a(tense, mood, "2", "pl"))]
    out += [(x, _a(tense, mood, p, "pl")) for x, p in ((p1s, "1"), (p2s, "2")) if x]
    return out


def _soft(stem: str) -> str:
    """t, d before a front ending: č, dž (skait- → skaičiau, gird- → girdžiu)"""
    return stem[:-1] + "č" if stem.endswith("t") else stem[:-1] + "dž" if stem.endswith("d") else stem


def verb_forms(infinitive: str, pres3: str, past3: str) -> list[tuple[str, dict]]:
    inf, p3, q3 = strip_lt(infinitive), strip_lt(pres3), strip_lt(past3)
    if not inf.endswith("ti") or not p3 or not q3:
        return []
    out = []
    # present
    if p3.endswith("ia"):
        s = p3[:-2]
        pres = [s + "iu", s + "i", p3, s + "iame", s + "iam", s + "iate", s + "iat"]
    elif p3.endswith("a"):
        s = p3[:-1]
        pres = [s + "u", s + "i", p3, s + "ame", s + "am", s + "ate", s + "at"]
    elif p3.endswith("i"):
        s = p3[:-1]
        pres = [_soft(s) + "iu", s + "i", p3, s + "ime", s + "im", s + "ite", s + "it"]
    elif p3.endswith("o"):
        s = p3[:-1]
        pres = [s + "au", s + "ai", p3, s + "ome", s + "om", s + "ote", s + "ot"]
    else:
        pres = None
    if pres:
        out += _rows(pres, "pres", "ind")
    # past
    if q3.endswith("o"):
        s = q3[:-1]
        out += _rows([s + "au", s + "ai", q3, s + "ome", s + "om", s + "ote", s + "ot"], "past", "ind")
    elif q3.endswith("ė"):
        s = q3[:-1]
        out += _rows([_soft(s) + "iau", s + "ei", q3, s + "ėme", s + "ėm", s + "ėte", s + "ėt"], "past", "ind")
    # from the infinitive stem: future, past frequentative, conditional, imperative
    s = inf[:-2]
    if s[-1:] in ("s", "š", "z", "ž"):
        f = s[:-1] + {"z": "s", "ž": "š"}.get(s[-1], s[-1])
        out += _rows([f + "iu", f + "i", f, f + "ime", f + "im", f + "ite", f + "it"], "fut", "ind")
    else:
        out += _rows([s + "siu", s + "si", s + "s", s + "sime", s + "sim", s + "site", s + "sit"], "fut", "ind")
    out += _rows([s + "davau", s + "davai", s + "davo", s + "davome", s + "davom", s + "davote", s + "davot"], "impf", "ind")
    out += _rows([s + "čiau", s + "tum", s + "tų", s + "tume", s + "tumėme", s + "tumėte", s + "tumėt"], "pres", "cond")
    out.append((s + "tumei", _a("pres", "cond", "2", "sg")))
    k = s[:-1] if s[-1:] in ("g", "k") else s
    out += [(k + "k", _a("pres", "imp", "2", "sg")), (k + "ki", _a("pres", "imp", "2", "sg")), (k + "kime", _a("pres", "imp", "1", "pl")),
            (k + "kim", _a("pres", "imp", "1", "pl")), (k + "kite", _a("pres", "imp", "2", "pl")), (k + "kit", _a("pres", "imp", "2", "pl"))]
    return out


_COND = [("1", "sg"), ("2", "sg"), ("2", "sg"), ("3", "sg"), ("1", "pl"), ("1", "pl"), ("1", "pl"), ("2", "pl"), ("2", "pl"), ("3", "pl")]
_IMP = [None, ("2", "sg"), ("2", "sg"), ("3", "sg"), ("3", "sg"), ("1", "pl"), ("1", "pl"), ("2", "pl"), ("2", "pl"), ("3", "pl"), ("3", "pl")]


def table_forms(cells: list[str]) -> list[tuple[str, dict]]:
    """a full 53-cell table, read by position: present, past, past frequentative, future (8 each), conditional (10),
    imperative (11, the first empty)"""
    if len(cells) != 53:
        return []
    out = []
    for g, tense in enumerate(("pres", "past", "impf", "fut")):
        f1, f2, f3, p1, p1s, p2, p2s, _ = cells[g * 8:(g + 1) * 8]
        out += _rows([f1, f2, f3, p1, p1s, p2, p2s], tense, "ind")
    for f, pn in zip(cells[32:42], _COND):
        out.append((f, _a("pres", "cond", *pn)))
    for f, pn in zip(cells[42:53], _IMP):
        if pn:
            out.append((f, _a("pres", "imp", *pn)))
    return [(f, a) for f, a in out if f and f != "-" and " " not in f]


_CASES = ("nom", "gen", "dat", "acc", "ins", "loc", "voc")


def _decl(stem_sg, sg, stem_pl, pl, gender):
    out = [(stem_sg + e, {"pos": "noun", "case": c, "number": "sg", "gender": gender}) for c, e in zip(_CASES, sg)]
    out += [(stem_pl + e, {"pos": "noun", "case": c, "number": "pl", "gender": gender}) for c, e in zip(_CASES, pl)]
    return out


def _soft_io(forms, stem):
    """t, d before i + vowel: briedis → briedžio, antis → ančių"""
    if not stem.endswith(("t", "d")):
        return forms
    soft = _soft(stem)
    return [(soft + f[len(stem):] if f[len(stem):len(stem) + 2] in ("io", "iu", "ia", "ių") else f, a) for f, a in forms]


def noun_forms(word: str, gender: str | None) -> list[tuple[str, dict]]:
    """the regular declensions from the nominative singular and gender (nouns Wiktionary gives without a table):
    I -as -ias -is(m) -ys, II -a -ia -ė, III -is(f), IV -us; -uo and the irregular ones are left out"""
    w = strip_lt(word)
    if w.endswith("ias") and gender in (None, "m"):
        s = w[:-3]
        return _decl(s, ("ias", "io", "iui", "ią", "iu", "yje", "y"), s, ("iai", "ių", "iams", "ius", "iais", "iuose", "iai"), "m")
    if w.endswith("jas") and gender in (None, "m"):
        s = w[:-2]
        return _decl(s, ("as", "o", "ui", "ą", "u", "uje", "au"), s, ("ai", "ų", "ams", "us", "ais", "uose", "ai"), "m")
    if w.endswith("as") and gender in (None, "m"):
        s = w[:-2]
        return _decl(s, ("as", "o", "ui", "ą", "u", "e", "e"), s, ("ai", "ų", "ams", "us", "ais", "uose", "ai"), "m")
    if w.endswith("ys") and gender in (None, "m"):
        return _soft_io(_decl(w[:-2], ("ys", "io", "iui", "į", "iu", "yje", "y"), w[:-2], ("iai", "ių", "iams", "ius", "iais", "iuose", "iai"), "m"), w[:-2])
    if w.endswith("is") and gender == "m":
        return _soft_io(_decl(w[:-2], ("is", "io", "iui", "į", "iu", "yje", "i"), w[:-2], ("iai", "ių", "iams", "ius", "iais", "iuose", "iai"), "m"), w[:-2])
    if w.endswith("is") and gender == "f":
        s = w[:-2]
        soft = s[:-1] + "č" if s.endswith("t") else s[:-1] + "dž" if s.endswith("d") else s
        out = _decl(s, ("is", "ies", "iai", "į", "imi", "yje", "ie"), s, ("ys", "ių", "ims", "is", "imis", "yse", "ys"), "f")
        return [(soft + f[len(s):] if a["case"] in ("dat",) and a["number"] == "sg" or (a["case"] == "gen" and a["number"] == "pl") else f, a) for f, a in out]
    if w.endswith("ius") and gender in (None, "m"):
        s = w[:-3]
        return _decl(s, ("ius", "iaus", "iui", "ių", "iumi", "iuje", "iau"), s, ("iai", "ių", "iams", "ius", "iais", "iuose", "iai"), "m")
    if w.endswith("us") and gender in (None, "m"):
        s = w[:-2]
        return _decl(s, ("us", "aus", "ui", "ų", "umi", "uje", "au"), s, ("ūs", "ų", "ums", "us", "umis", "uose", "ūs"), "m")
    if w.endswith("ia") and gender in (None, "f"):
        s = w[:-2]
        return _decl(s, ("ia", "ios", "iai", "ią", "ia", "ioje", "ia"), s, ("ios", "ių", "ioms", "ias", "iomis", "iose", "ios"), "f")
    if w.endswith("a") and gender in (None, "f"):
        s = w[:-1]
        return _decl(s, ("a", "os", "ai", "ą", "a", "oje", "a"), s, ("os", "ų", "oms", "as", "omis", "ose", "os"), "f")
    if w.endswith("ė") and gender in (None, "f"):
        s = w[:-1]
        soft = s[:-1] + "č" if s.endswith("t") else s[:-1] + "dž" if s.endswith("d") else s
        out = _decl(s, ("ė", "ės", "ei", "ę", "e", "ėje", "e"), s, ("ės", "ių", "ėms", "es", "ėmis", "ėse", "ės"), "f")
        return [(soft + "ių" if a["case"] == "gen" and a["number"] == "pl" else f, a) for f, a in out]
    return []
