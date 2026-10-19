"""Korean conjugation (Allan, 2026-10-19: 먹어서, 괴로워했다 were unknown). Wiktionary's tables give the polite and
plain sentence endings of many verbs; the connectives (-아서, -지만, -(으)니까), the noun-modifying forms (-는, -(으)ㄴ,
-(으)ㄹ) and many verbs are missing. These are regular once the infinitive (the -아/어 form) is known, and Wiktionary's
infinitive carries the irregular stems (괴롭다 → 괴로워, 듣다 → 들어, 모르다 → 몰라); without one, the rules below.
Adjectives also give the verb "to feel/show it" (괴롭다 → 괴로워하다)."""
from __future__ import annotations

_BASE = 0xAC00
A, AE, EO, E, YEO, O, WA, WAE, OE, U, WEO, WI, EU, I = 0, 1, 4, 5, 6, 8, 9, 10, 11, 13, 14, 16, 18, 20
NONE, N, D, L, M, B, S, SS = 0, 4, 7, 8, 16, 17, 19, 20


def split(ch: str) -> tuple[int, int, int]:
    c = ord(ch) - _BASE
    return c // 588, (c % 588) // 28, c % 28


def join(lead: int, vowel: int, tail: int = 0) -> str:
    return chr(_BASE + (lead * 21 + vowel) * 28 + tail)


def is_hangul(ch: str) -> bool:
    return 0 <= ord(ch) - _BASE < 11172


def with_tail(ch: str, tail: int) -> str:
    lead, vowel, _ = split(ch)
    return join(lead, vowel, tail)




def infinitive(word: str) -> str:
    stem = word[:-1]
    if stem.endswith("하"):
        return stem[:-1] + "해"
    last = stem[-1]
    lead, vowel, tail = split(last)
    bright = vowel in (A, O) if vowel != EU or len(stem) == 1 else split(stem[-2])[1] in (A, O)
    if tail:
        return stem + ("아" if bright else "어")
    new = {A: A, EO: EO, AE: AE, E: E, O: WA, U: WEO, I: YEO, OE: WAE}.get(vowel)
    if vowel == EU:
        new = A if bright else EO
    if new is None:
        return stem + "어"
    return stem[:-1] + join(lead, new)


def conjugate(word: str, pos: str, inf: str | None = None) -> dict[str, list[str]]:
    stem = word[:-1]
    inf = inf or infinitive(word)
    last = stem[-1]
    lead, vowel, tail = split(last)
    past = inf[:-1] + with_tail(inf[-1], SS)
    regular_inf = infinitive(word)
    # the stem the -(으) endings attach to, and whether they need 으
    base, needs_eu, l_stem = stem, tail not in (NONE, L), tail == L
    if tail == B and inf != regular_inf:              # ㅂ irregular: 괴롭 → 괴로우
        base, needs_eu = stem[:-1] + join(lead, vowel) + "우", False
    elif tail == D and is_hangul(inf[len(stem) - 1]) and split(inf[len(stem) - 1])[2] == L:   # ㄷ irregular: 듣 → 들으
        base = stem[:-1] + join(lead, vowel, L)
    elif tail == S and inf != regular_inf:            # ㅅ irregular: 짓 → 지으
        base = stem[:-1] + join(lead, vowel)
    elif tail == 27 and pos == "adj" and inf != regular_inf:   # ㅎ adjectives: 빨갛 → 빨가
        base, needs_eu = stem[:-1] + join(lead, vowel), False
    dropped = stem[:-1] + join(lead, vowel) if l_stem else stem   # ㄹ drops before ㄴ, ㅂ, ㅅ (사니까, 삽니다, 사는)

    def eu(suffix: str, drop: bool = False) -> str:
        return (dropped if drop and l_stem else base) + ("으" if needs_eu else "") + suffix

    def tail_on(t: int) -> str:                        # an ending that is only a final consonant: ㄴ, ㄹ
        if needs_eu:
            return base + {N: "은", L: "을"}[t]
        b = dropped if l_stem else base
        return b[:-1] + with_tail(b[-1], t)

    verb = pos == "verb"
    consonant = tail not in (NONE, L)
    out = {
        "dict": word, "inf": inf, "seq": eu("니", drop=True), "and": stem + "고", "if": eu("면"), "so": inf + "서", "even": inf + "도", "but": stem + "지만",
        "since": eu("니까", drop=True), "ji": stem + "지", "ge": stem + "게", "noun": stem + "기", "will": stem + "겠다",
        "intent": eu("려고"), "purpose": eu("러"),
        "adn fut": tail_on(L),
        "hamnida": stem + "습니다" if consonant else (dropped[:-1] + with_tail(dropped[-1], B) + "니다"),
        "haeyo": inf + "요", "hae": inf, "handa past": past + "다", "haeyo past": past + "어요", "hae past": past + "어",
        "hamnida past": past + "습니다",
    }
    if verb:
        out.update({"adn pres": (dropped if l_stem else stem) + "는", "adn past": tail_on(N), "bg": (dropped if l_stem else stem) + "는데",
                    "handa": stem + "는다" if consonant else (dropped[:-1] + with_tail(dropped[-1], N) + "다")})
    else:
        out.update({"adn pres": tail_on(N), "bg": tail_on(N) + "데", "handa": word})
    return {k: [v] for k, v in out.items()}


def feel_verb(word: str, inf: str | None = None) -> str:
    """an adjective's verb of feeling or showing it: 괴롭다 → 괴로워하다, 행복하다 → 행복해하다"""
    return (inf or infinitive(word)) + "하다"


def add_conjugations(entries: list[dict], start_id: int) -> list[dict]:
    """every verb and adjective gets the forms Wiktionary's table lacks; each adjective its verb of feeling (a new entry,
    its meaning written for Casus) unless the dictionary has it"""
    have = {e["headword"] for e in entries}
    extra = []
    for e in entries:
        if e["pos"] not in ("verb", "adj") or not e["headword"].endswith("다") or len(e["headword"]) < 2:
            continue
        inf = next((t for t, n in e["cells"] if n == "inf"), None)
        for name, texts in conjugate(e["headword"], e["pos"], inf).items():
            for t in texts:
                if name != "dict" and (t, name) not in e["cells"]:
                    e["cells"].append((t, name))
        if e["pos"] == "adj":
            fv = feel_verb(e["headword"], inf)
            if fv not in have:
                have.add(fv)
                first = e["gloss_en"].split(";")[0].strip()
                extra.append({"id": start_id + len(extra), "headword": fv, "pos": "verb", "hanja": None, "ipa": [],
                              "gloss_en": f"to feel or show it: {first} (from {e['headword']}; meaning written for Casus)",
                              "cells": [(t, n) for n, ts in conjugate(fv, "verb").items() for t in ts if n != "dict"]})
    return entries + extra
