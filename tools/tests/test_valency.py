import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.de.valency import valency_by_lemma, valency_table  # noqa: E402


def test_table_has_the_classic_frames():
    t = valency_table()
    assert t["helfen"] == ["dat"] and t["geben"] == ["acc", "dat"] and t["gedenken"] == ["gen"] and t["sehen"] == ["acc"]


def test_keyed_by_verb_lemma_id_only():
    lemmas = {"1": {"headword": "helfen", "pos": "verb"}, "2": {"headword": "helfen", "pos": "noun"}, "3": {"headword": "gehen", "pos": "verb"}}
    assert valency_by_lemma(lemmas) == {"1": ["dat"]}
