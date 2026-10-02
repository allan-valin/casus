import unicodedata

_LETTER_MAP = str.maketrans({"j": "i", "v": "u"})


def normalize_form(s: str) -> str:
    """Lowercase, strip diacritics, fold j->i and v->u. Lookup keys only.

    Must stay identical to src/lib/normalize.js; tests/fixtures/normalization.json
    is run against both.
    """
    decomposed = unicodedata.normalize("NFD", s.lower())
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return stripped.translate(_LETTER_MAP)
