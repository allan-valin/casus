"""Ancient Greek lookup keys (docs/languages/grc.md §7), mirrored by src/lang/grc/normalize.js.

normalize_grc: NFD, lower case, final sigma → σ, length marks (macron U+0304, breve U+0306) dropped,
grave → acute (running text writes καὶ, τὸν; the dictionary καί, τόν), breathings, accents, diaeresis
and iota subscript otherwise KEPT (they distinguish words), NFC.
strip_grc: every combining mark dropped too — the second key, for text typed without diacritics.
"""
import unicodedata

_LENGTH = {"̄", "̆"}


def normalize_grc(s: str) -> str:
    d = unicodedata.normalize("NFD", s).lower().replace("ς", "σ")
    d = "".join(ch for ch in d if ch not in _LENGTH).replace("\u0300", "\u0301")
    return unicodedata.normalize("NFC", d)


def strip_grc(s: str) -> str:
    d = unicodedata.normalize("NFD", s).lower().replace("ς", "σ")
    return "".join(ch for ch in d if not unicodedata.combining(ch))


def has_marks(s: str) -> bool:
    return any(unicodedata.combining(ch) and ch not in _LENGTH for ch in unicodedata.normalize("NFD", s))
