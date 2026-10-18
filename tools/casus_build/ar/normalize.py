"""The key Arabic forms are found by: the bare letters (overnight plan 2026-10-19). Short vowels, tanwin, shadda,
sukun, dagger alif and tatweel go; the alif forms أ إ آ ٱ fold to ا and final ى to ي (how text is commonly
typed). Mirrored by src/lang/ar/normalize.js (fixture tests/fixtures/ar.strip.json)."""
import re
import unicodedata

_MARKS = re.compile("[ً-ٰٟـۖ-ۭ]")
_ALIF = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي"})


def strip_ar(s: str) -> str:
    return _MARKS.sub("", unicodedata.normalize("NFC", s)).translate(_ALIF)
