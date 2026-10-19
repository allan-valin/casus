"""The key Russian forms are found by (overnight plan 2026-10-19): lower case, stress marks gone, ё folded to е
(ordinary text writes е for ё and never marks stress). Mirrored by src/lang/ru/normalize.js (fixture
tests/fixtures/ru.strip.json)."""
import unicodedata


def strip_ru(s: str) -> str:
    d = unicodedata.normalize("NFD", s.lower())
    d = "".join(c for c in d if c not in "́̀̈")       # acute, grave, and the diaeresis of ё
    return unicodedata.normalize("NFC", d)
