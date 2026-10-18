"""Phrase and frequency lists for the drills (Allan, 2026-10-18)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_wordlists import phrase_item, parse_core_rows  # noqa: E402


def entry(word, pos="phrase", gloss="x", tags=(), cats=()):
    return {"word": word, "pos": pos, "senses": [{"glosses": [gloss], "tags": list(tags), "categories": [{"name": c} for c in cats]}]}


def test_kinds():
    assert phrase_item(entry("vielen Dank", gloss="thank you very much"))["kind"] == "phrase"
    assert phrase_item(entry("Schwein haben", pos="verb", gloss="to be lucky", tags=["idiomatic"]))["kind"] == "idiom"
    assert phrase_item(entry("in vino veritas", pos="proverb", gloss="in wine, truth"))["kind"] == "proverb"


def test_skips_what_teaches_nothing():
    assert phrase_item(entry("Haus", gloss="house")) is None                       # one word
    assert phrase_item(entry("auf den Keks gehen", pos="verb", gloss="synonym of auf die Nerven gehen", tags=["idiomatic"])) is None
    assert phrase_item(entry("τί πράττεις", gloss="Attic form of τί πράσσεις")) is None
    assert phrase_item(entry("you name it", gloss="you name it")) is None           # gloss = the phrase
    assert phrase_item(entry("kalter Bauer", pos="noun", gloss="x", tags=["idiomatic", "vulgar"])) is None
    assert phrase_item(entry("San Marino", pos="name", gloss="San Marino (a country)")) is None


def test_core_rows():
    html = "<table><tr><th>h</th></tr><tr><td>ā ab abs</td><td>from, by (+abl.)</td><td>Preposition</td><td>Place</td><td>21</td></tr></table>"
    assert parse_core_rows(html) == [{"w": "ā ab abs", "en": "from, by (+abl.)", "pos": "Preposition", "rank": 21}]
