import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_zh import zh_learn, forms_of  # noqa: E402

FIX = Path(__file__).parent / "fixtures" / "zh"


def test_forms_of_a_syllabus_entry():
    assert forms_of("非常、很、太、真、最") == ["非常", "很", "太", "真", "最"]
    assert forms_of("了1") == ["了"]
    assert forms_of("动宾式离合词：帮忙、见面") == ["帮忙", "见面"]


def test_chinese_lessons_from_the_hsk_syllabus():
    notes = {"动态助词": {"en": "Aspect particles.", "pt": "Partículas de aspecto.", "match": {"seq": [{"word": ["了"]}]}}}
    index, lessons, questions = zh_learn(FIX / "grammar.csv", FIX / "hsk30.csv", FIX / "cedict.txt.gz", notes, sentences=[("我很好。", "I'm fine.", None)])
    assert [lv["id"] for lv in index["levels"]] == ["HSK 1", "HSK 3", "HSK 4"]
    deg = lessons["zh-9"]
    assert deg["title"] == "非常、很、太、真、最" and deg["meaning"]["en"].startswith("adverbs of degree")
    assert deg["match"] == {"seq": [{"word": ["非常", "很", "太", "真", "最"]}]} and deg["pool"] == ["非常", "很", "太", "真", "最"]
    table = deg["sections"][0]["html"]["en"]
    assert "fēicháng" in table and "very; really" in table and "我很好。" in table
    asp = lessons["zh-21"]
    assert "Aspect particles." in asp["intro"]["en"] and asp["match"] == {"seq": [{"word": ["了"]}]}
    frame = lessons["zh-300"]
    assert frame["match"] == {"seq": [{"word": ["还是"]}, {"word": ["吧"]}], "near": 8, "gap": 0}
    words = [t for t in index["levels"][0]["topics"] if t["kind"] == "vocab"][0]
    w = lessons[words["lessons"][0]["id"]]["words"]
    assert {"w": "很", "reading": "hěn", "en": "very; quite"} in w and {"w": "爱", "reading": "ài", "en": "to love"} in w


def test_glosses_follow_the_hsk_reading_and_keep_three_senses():
    index, lessons, _ = zh_learn(FIX / "grammar.csv", FIX / "hsk30.csv", FIX / "cedict.txt.gz", {})
    words = {w["w"]: w["en"] for l in lessons.values() if l.get("kind") == "vocab" for w in l["words"]}
    assert words["太"] == "highest; greatest; too (much)"
    assert words["得"] == "structural particle: used after a verb"


def test_glosses_skip_proper_nouns_and_long_notes():
    from learn_zh import gloss_of
    entries = [("bai|2", "Bai ethnic group", True), ("bai|2", "white; snowy; pure", False)]
    assert gloss_of(entries, "bái") == "white; snowy; pure"


def test_a_note_in_more_interface_languages():
    """notes.yml may carry de / mk / ar beside en and pt (Learn in German, Macedonian, Arabic; 2026-10-20)"""
    notes = {"动态助词": {"en": "Aspect particles.", "pt": "Partículas.", "mk": "Честички за вид.", "ar": "أدوات الهيئة."}}
    _, lessons, _ = zh_learn(FIX / "grammar.csv", FIX / "hsk30.csv", FIX / "cedict.txt.gz", notes)
    intro = lessons["zh-21"]["intro"]
    assert "Честички за вид." in intro["mk"] and "أدوات الهيئة." in intro["ar"] and "de" not in intro
