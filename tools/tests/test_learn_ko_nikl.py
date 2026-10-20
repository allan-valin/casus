import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_ko_nikl import nikl_lessons, forms_of, final_class  # noqa: E402

FIX = Path(__file__).parent / "fixtures" / "nikl"


def test_forms_drop_sense_numbers_dashes_and_relations():
    assert forms_of("-으려고1", "-려고1, 으려, 려") == ["으려고", "려고", "으려", "려"]
    assert forms_of("-을 따름이다", "-ㄹ 따름이다, <유의> -을 뿐이다") == ["을 따름이다", "ㄹ 따름이다"]


def test_a_jamo_final_becomes_a_class_of_syllables():
    c = final_class("ㄹ")
    assert re.fullmatch(f"[{c}]", "갈") and re.fullmatch(f"[{c}]", "할") and not re.fullmatch(f"[{c}]", "가")


def test_lessons_from_the_nikl_list():
    index = {"levels": [{"id": "TOPIK 1", "topics": []}, {"id": "TOPIK 2", "topics": []}]}
    lessons, questions = {}, {"TOPIK 1": {}, "TOPIK 2": {}}
    n = nikl_lessons(FIX / "grammar.csv", FIX / "grammar.json", index, lessons, questions)
    assert n == 4
    i = lessons["ko-nikl-1"]
    assert i["title"] == "이" and i["match"] == {"seq": [{"word": ["이", "가"]}], "gap": 0}
    assert "A particle marking the subject." in i["intro"]["en"] and "달이 밝다." in i["intro"]["en"]
    myeon = lessons["ko-nikl-5"]
    assert myeon["match"]["seq"][0]["re"] == "(으면|면|이면)$" and myeon["match"]["suffixes"][:3] == ["으면", "면", "이면"]
    want = lessons["ko-nikl-9"]
    assert want["match"]["seq"] == [{"pos": ["verb", "adj"], "re": "(고)$"}, {"re": "^싶"}] and want["match"]["gap"] == 0
    rae = lessons["ko-nikl-12"]
    assert rae["level"] == "TOPIK 2" and rae["match"]["seq"][0]["re"].startswith("(을래|을래요|[")
    assert [t["title"]["en"] for t in index["levels"][0]["topics"]] == ["Official syllabus: particles", "Official syllabus: endings", "Official syllabus: expressions"]
    assert "NIKL" in i["source"]


def test_english_definitions_get_their_portuguese_from_translation_not_a_copy():
    """the pt intro used to be the English definitions with a note; it is now left to tools/translate_learn.py
    (Allan, 2026-10-20: every imported text in every interface language)"""
    index = {"levels": [{"id": "TOPIK 1", "topics": []}, {"id": "TOPIK 2", "topics": []}]}
    lessons, questions = {}, {"TOPIK 1": {}, "TOPIK 2": {}}
    nikl_lessons(FIX / "grammar.csv", FIX / "grammar.json", index, lessons, questions)
    assert "pt" not in lessons["ko-nikl-1"]["intro"]
