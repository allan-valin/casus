"""Fixed expressions (Allan, 2026-10-18): Wiktionary's multiword entries, matched in the page."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.expressions import build_expressions  # noqa: E402

ENTRIES = [
    {"id": 1, "headword": "es war einmal", "pos": "phrase", "gloss_en": "once upon a time"},
    {"id": 2, "headword": "Bescheid sagen", "pos": "verb", "gloss_en": "to let (someone) know"},
    {"id": 3, "headword": "sagen", "pos": "verb", "gloss_en": "to say"},
    {"id": 4, "headword": "gar nicht", "pos": "adv", "gloss_en": "not at all, not one bit, no way"},
    {"id": 5, "headword": "Haus", "pos": "noun", "gloss_en": "house"},
    {"id": 6, "headword": "sagen", "pos": "verb", "gloss_en": "to tell"},
]


def test_multiword_entries_become_expressions_with_their_gloss():
    ex = build_expressions(ENTRIES)
    by = {e["id"]: e for e in ex}
    assert by[1]["w"] == ["es", "war", "einmal"] and by[1]["v"] is None and by[1]["g"] == "once upon a time"
    assert by[4]["w"] == ["gar", "nicht"]
    assert 5 not in by and 3 not in by


def test_a_verb_idiom_keeps_its_nominal_words_and_the_verbs_lemma_ids():
    ex = {e["id"]: e for e in build_expressions(ENTRIES)}
    assert ex[2]["w"] == ["bescheid"] and sorted(ex[2]["v"]) == [3, 6]
