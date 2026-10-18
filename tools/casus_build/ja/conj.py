"""Japanese conjugation (overnight plan 2026-10-19): the standard forms of a verb or adjective from its class,
for the dictionary index; Wiktionary's own tables are kept besides. Classes: godan, godan-iku (行く: 行って),
ichidan, suru (する and noun+する), kuru (来る/くる), i (adjective), na (adjective)."""
from __future__ import annotations

ROWS = {  # godan ending -> (a, i, e, o) rows
    "う": ("わ", "い", "え", "お"), "く": ("か", "き", "け", "こ"), "ぐ": ("が", "ぎ", "げ", "ご"), "す": ("さ", "し", "せ", "そ"),
    "つ": ("た", "ち", "て", "と"), "ぬ": ("な", "に", "ね", "の"), "ぶ": ("ば", "び", "べ", "ぼ"), "む": ("ま", "み", "め", "も"),
    "る": ("ら", "り", "れ", "ろ"),
}
TE = {"う": "って", "つ": "って", "る": "って", "く": "いて", "ぐ": "いで", "す": "して", "ぬ": "んで", "ぶ": "んで", "む": "んで"}


def _verb(stem_neg: str, stem_i: str, te: str, ta: str, vol: str, pot: str, passive: str, caus: str, cond: str, imp: str, dict_form: str) -> dict:
    return {
        "dict": [dict_form], "neg": [stem_neg + "ない"], "pastneg": [stem_neg + "なかった"], "past": [ta], "te": [te],
        "polite": [stem_i + "ます"], "politeneg": [stem_i + "ません"], "politepast": [stem_i + "ました"],
        "politepastneg": [stem_i + "ませんでした"], "politevol": [stem_i + "ましょう"], "stem": [stem_i],
        "vol": [vol], "pot": [pot], "pass": [passive], "caus": [caus], "cond": [cond], "tara": [ta + "ら"],
        "imp": [imp], "des": [stem_i + "たい"], "desneg": [stem_i + "たくない"], "despast": [stem_i + "たかった"],
        "negte": [stem_neg + "ないで"], "negcond": [stem_neg + "なければ"],
    }


def conjugate(word: str, cls: str) -> dict[str, list[str]]:
    if cls == "ichidan" and word.endswith("る"):
        s = word[:-1]
        return _verb(s, s, s + "て", s + "た", s + "よう", s + "られる", s + "られる", s + "させる", s + "れば", s + "ろ", word)
    if cls in ("godan", "godan-iku") and word[-1:] in ROWS:
        s, end = word[:-1], word[-1]
        a, i, e, o = ROWS[end]
        te = s + ("って" if cls == "godan-iku" else TE[end])
        ta = te[:-1] + ("だ" if te.endswith("で") else "た")
        return _verb(s + a, s + i, te, ta, s + o + "う", s + e + "る", s + a + "れる", s + a + "せる", s + e + "ば", s + e, word)
    if cls == "suru" and word.endswith("する"):
        p = word[:-2]
        f = _verb(p + "し", p + "し", p + "して", p + "した", p + "しよう", p + "できる", p + "される", p + "させる", p + "すれば", p + "しろ", word)
        return f
    if cls == "kuru" and word in ("来る", "くる"):
        if word == "くる":
            return _verb("こ", "き", "きて", "きた", "こよう", "こられる", "こられる", "こさせる", "くれば", "こい", word)
        return _verb("来", "来", "来て", "来た", "来よう", "来られる", "来られる", "来させる", "来れば", "来い", word)
    if cls == "i" and word.endswith("い"):
        s = "よ" if word == "いい" else word[:-1]
        return {"dict": [word], "adv": [s + "く"], "neg": [s + "くない"], "past": [s + "かった"], "pastneg": [s + "くなかった"],
                "te": [s + "くて"], "cond": [s + "ければ"], "noun": [s + "さ"], "seem": [s + "そう"]}
    if cls == "na":
        return {"dict": [word], "attr": [word + "な"], "adv": [word + "に"], "te": [word + "で"], "copula": [word + "だ"],
                "past": [word + "だった"], "neg": [word + "じゃない", word + "ではない"], "pastneg": [word + "じゃなかった"],
                "polite": [word + "です"], "politepast": [word + "でした"]}
    return {}
