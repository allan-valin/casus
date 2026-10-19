import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.zh.cedict import marks, parse_cedict, missing_entries, reading_order  # noqa: E402

LINES = ["# comment", "都 都 [Du1] /surname Du/", "都 都 [dou1] /all; both; entirely/(used for emphasis) even/already/",
         "都 都 [du1] /capital city/metropolis/", "學校 学校 [xue2 xiao4] /school/CL:所[suo3]/", "女 女 [nu:3] /female/woman/",
         "唄 呗 [bei5] /modal particle indicating obviousness/", "妳 你 [ni3] /variant of 你[ni3]/"]


def test_numbered_pinyin_becomes_tone_marks():
    assert marks("dou1") == "dōu" and marks("xue2 xiao4") == "xuéxiào" and marks("nu:3") == "nǚ" and marks("bei5") == "bei"
    assert marks("hao3") == "hǎo" and marks("gui4") == "guì" and marks("liu2") == "liú"
    assert marks("m2") == "m" and marks("ng4") == "ng"           # syllabic nasals carry no vowel to mark


def test_cedict_adds_only_what_wiktionary_lacks_no_surnames_or_variants():
    cedict = list(parse_cedict(LINES))
    have = [{"headword": "都", "simplified": None, "pinyin": "dū"}, {"headword": "學校", "simplified": "学校", "pinyin": "xuéxiào"}]
    added = missing_entries(have, cedict, start_id=100)
    assert [(e["headword"], e["pinyin"], e["gloss_en"]) for e in added] == [
        ("都", "dōu", "all; both; entirely; (used for emphasis) even; already"), ("女", "nǚ", "female; woman"),
        ("唄", "bei", "modal particle indicating obviousness")]
    assert added[0]["id"] == 100 and added[2]["simplified"] == "呗" and added[2]["pos"] == "particle"


def test_unihan_orders_a_characters_readings():
    order = reading_order(["U+90FD\tkMandarin\tdōu dū", "U+90FD\tkHanyuPinyin\t1:dū"])
    assert order["都"] == ["dōu", "dū"]


def test_adverbs_by_their_gloss():
    from casus_build.zh.parse import char_pos
    assert char_pos("all; both; entirely") == "adv" and char_pos("already") == "adv" and char_pos("very; quite") == "adv"
    assert char_pos("capital city; metropolis") == "noun"


def test_a_characters_rows_follow_unihan():
    from casus_build.zh.parse import build_index
    from casus_build.zh.cedict import order_rows
    entries = [{"id": 1, "headword": "都", "simplified": None, "pos": "noun", "pinyin": "dū"}, {"id": 2, "headword": "都", "simplified": None, "pos": "adv", "pinyin": "dōu"}]
    index = order_rows(build_index(entries), {"都": ["dōu", "dū"]})
    assert [a["reading"] for a in index["都"]] == ["dōu", "dū"]


def test_a_neutral_tone_variant_of_a_word_we_have_is_not_added_and_frequent_names_are():
    cedict = list(parse_cedict(["學生 学生 [xue2 sheng5] /student/", "北京 北京 [Bei3 jing1] /Beijing, capital of the People's Republic of China/",
                                "某地 某地 [Mou3 di4] /some rare place/"]))
    have = [{"headword": "學生", "simplified": "学生", "pinyin": "xuéshēng"}]
    added = missing_entries(have, cedict, start_id=1, frequent={"北京"})
    assert [(e["simplified"] or e["headword"], e["pos"]) for e in added] == [("北京", "noun")]
