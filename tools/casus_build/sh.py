"""Serbo-Croatian (2026-10-21; docs/languages/sh.md). Keys without the dictionary's tone and length marks, which sit on
vowels and syllabic r (kȕća, kȕćē, ку̏ћа); the marks of the consonant letters ć č š ž stay. Mirror of
src/lang/sh/script.js stripSh."""
from __future__ import annotations

import unicodedata

_BASES = set("aeiouAEIOUrRаеиоуАЕИОУрР")


def strip_sh(s: str) -> str:
    out = []
    for c in unicodedata.normalize("NFD", s.lower()):
        if unicodedata.combining(c) and out and out[-1] in _BASES:
            continue
        out.append(c)
    return unicodedata.normalize("NFC", "".join(out))
