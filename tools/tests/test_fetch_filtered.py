import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fetch_filtered import keep_entry  # noqa: E402


def test_keeps_common_words_their_forms_closed_classes_and_phrases():
    common = {"talo", "talossa", "ja"}
    e = lambda word, pos, forms=(): {"word": word, "pos": pos, "forms": [{"form": f} for f in forms]}
    assert keep_entry(e("talo", "noun"), common)
    assert keep_entry(e("kirjasto", "noun", ["talossa"]), common)        # a form is common
    assert not keep_entry(e("harvinainen", "adj"), common)
    assert keep_entry(e("mutta", "conj"), common)                        # closed class
    assert keep_entry(e("hyvää huomenta", "phrase"), common)
    assert not keep_entry(e("Talo", "name"), common)
