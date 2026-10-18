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


def test_the_meaning_is_the_real_sense_and_the_literal_one_is_kept_apart():
    d = {"word": "memento mori", "pos": "phrase", "senses": [
        {"glosses": ["Be mindful of dying."], "tags": ["literally"]},
        {"glosses": ["Do not forget that you are only human."], "tags": ["idiomatic"]}]}
    item = phrase_item(d)
    assert item["en"] == "Do not forget that you are only human."
    assert item["literally"] == "Be mindful of dying."
    assert item["kind"] == "idiom"


def test_further_senses_are_kept_as_more():
    d = {"word": "carpe diem", "pos": "phrase", "senses": [{"glosses": ["seize the day"]}, {"glosses": ["enjoy the present, as opposed to placing all hope in the future"]}]}
    assert phrase_item(d)["more"] == ["enjoy the present, as opposed to placing all hope in the future"]


def test_a_wikipedia_summary_counts_only_when_it_is_about_the_phrase():
    from build_wordlists import wiki_note
    good = {"type": "standard", "title": "Memento mori", "extract": "Memento mori (Latin for 'remember that you [have to] die') is an artistic or symbolic trope acting as a reminder of the inevitability of death. The concept has its roots in the philosophers of classical antiquity. A third sentence that is cut."}
    note = wiki_note("memento mori", good)
    assert note["title"] == "Memento mori"
    assert note["text"].startswith("Memento mori (Latin for") and "third sentence" not in note["text"]
    assert wiki_note("ad astra", {"type": "standard", "title": "Astra (company)", "extract": "Astra is a rocket company."}) is None
    assert wiki_note("ad hoc", {"type": "disambiguation", "title": "Ad hoc", "extract": "Ad hoc may refer to:"}) is None


def test_jlpt_csv_rows():
    from build_wordlists import parse_jlpt_csv
    text = 'expression,reading,meaning,tags,guid\n会う,あう,"to meet, to see",JLPT JLPT_N5,x\nああ,ああ,"Ah!, Oh!",JLPT,y\n'
    assert parse_jlpt_csv(text, "N5", 0) == [{"w": "会う", "reading": "あう", "en": "to meet, to see", "level": "N5", "rank": 1},
                                             {"w": "ああ", "en": "Ah!, Oh!", "level": "N5", "rank": 2}]


def test_a_japanese_phrase_keeps_its_reading():
    d = {"word": "猿も木から落ちる", "pos": "proverb", "senses": [{"glosses": ["even monkeys fall from trees"]}],
         "head_templates": [{"expansion": "猿(さる)も木(き)から落(お)ちる • (saru mo ki kara ochiru)"}]}
    assert phrase_item(d)["reading"] == "さるもきからおちる"
