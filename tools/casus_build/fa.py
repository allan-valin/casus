"""Persian (2026-10-21; docs/languages/fa.md). Keys: Arabic-script letters without the short-vowel marks, Arabic yeh and
kaf folded into the Persian ی and ک, the zero-width non-joiner of می‌روم kept as written (texts drop it as often as they
write it, so the reader looks words up both ways). Cells carry their romanization and alternatives in one string
(خانه را، خانه رو (xâné râ…)): the first Persian form is kept. Mirror of src/lang/fa/script.js stripFa."""
from __future__ import annotations

import re
import unicodedata

_MARKS = re.compile("[ً-ْٰٕٔ]")


def strip_fa(s: str) -> str:
    s = unicodedata.normalize("NFC", s)
    s = _MARKS.sub("", s).replace("ي", "ی").replace("ك", "ک").replace("ى", "ی")
    return s.replace("‌", "").strip()


def clean_fa(t: str) -> str:
    return re.split(r"\s*[،(,]\s*", t.strip(), maxsplit=1)[0].strip()
