"""Fixed expressions from a Wiktextract extract's multiword entries (Allan, 2026-10-18: "es war einmal",
"Freundschaft schließen"). An expression is its words in lower case; a verb idiom ("Bescheid sagen") keeps its
non-verb words and the lemma ids of the single-word verb its last word names, so the page can match the verb
inflected and anywhere in the clause ("sagte … Bescheid"). The gloss travels with it, shortened."""
from __future__ import annotations

import re

_WORD = re.compile(r"^[\w'’-]+$")


def build_expressions(entries) -> list[dict]:
    entries = list(entries)
    verbs: dict[str, list[int]] = {}
    for e in entries:
        if e["pos"] == "verb" and " " not in e["headword"]:
            verbs.setdefault(e["headword"].lower(), []).append(e["id"])
    out = []
    for e in entries:
        words = e["headword"].split()
        if len(words) < 2 or not all(_WORD.match(w) for w in words):
            continue
        gloss = (e.get("gloss_en") or "").split(";")[0][:80]
        if e["pos"] == "verb" and words[-1].lower() in verbs:
            out.append({"id": e["id"], "h": e["headword"], "w": [w.lower() for w in words[:-1]], "v": verbs[words[-1].lower()], "g": gloss})
        else:
            out.append({"id": e["id"], "h": e["headword"], "w": [w.lower() for w in words], "v": None, "g": gloss})
    return out
