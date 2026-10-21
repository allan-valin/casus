"""Hebrew (2026-10-21; docs/languages/he.md). Keys without vowel points or cantillation; texts are written without
points in full spelling (ktiv male), so every pointed dictionary form also gets its full spelling after the Academy of
the Hebrew Language's rules: holam and qubuts → ו, hiriq → י unless the syllable is closed (a shva or the word's end
follows), a consonantal vav inside the word doubled (מצווה). Mirror of src/lang/he/script.js stripHe."""
from __future__ import annotations

import unicodedata

_POINTS = {chr(c) for c in range(0x0591, 0x05C8) if c not in (0x05BE, 0x05C0, 0x05C3, 0x05C6)}
HOLAM, QUBUTS, HIRIQ, SHVA, DAGESH = "ֹ", "ֻ", "ִ", "ְ", "ּ"
VOWELS = {chr(c) for c in range(0x05B0, 0x05BC)} | {"ׇ"}


def strip_he(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFC", s) if c not in _POINTS).replace("־", "").strip()


def _letters(s: str) -> list[tuple[str, str]]:
    """[(letter, its points)], the maqaf dropped"""
    out = []
    for c in unicodedata.normalize("NFD", s).replace("־", ""):
        if c in _POINTS:
            if out:
                out[-1] = (out[-1][0], out[-1][1] + c)
        else:
            out.append((c, ""))
    return out


def plene(pointed: str) -> str:
    ls = _letters(pointed)
    out = []
    for i, (ch, marks) in enumerate(ls):
        nxt = ls[i + 1] if i + 1 < len(ls) else None
        if ch == "ו" and HOLAM not in marks and i > 0 and set(marks) & VOWELS and i + 1 < len(ls):
            out.append("וו")                                     # consonantal vav inside a word
            continue
        out.append(ch)
        if HOLAM in marks and ch != "ו" and not (nxt and nxt[0] == "ו"):
            out.append("ו")
        elif QUBUTS in marks:
            out.append("ו")
        elif HIRIQ in marks and nxt and nxt[0] != "י" and SHVA not in nxt[1]:
            closed_end = i + 1 == len(ls) - 1 and not set(nxt[1]) & VOWELS      # אִם, מִן
            if not closed_end:
                out.append("י")
    return "".join(out)
