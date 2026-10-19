import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.zh.parse import parse_entries, build_index  # noqa: E402


def test_traditional_entry_simplified_key_pinyin_reading():
    line = json.dumps({"word": "學校", "pos": "noun", "forms": [{"form": "学校", "tags": ["Simplified-Chinese"]}, {"form": "學較", "tags": ["alternative", "obsolete"]}],
                       "sounds": [{"zh_pron": "xuéxiào", "tags": ["Mandarin", "Standard", "Pinyin"]}], "senses": [{"glosses": ["school"]}]}, ensure_ascii=False)
    redirect = json.dumps({"word": "学校", "pos": "soft-redirect", "senses": [{}]}, ensure_ascii=False)
    char = json.dumps({"word": "吃", "pos": "character", "sounds": [{"zh_pron": "chī (chi¹)", "tags": ["Mandarin", "Standard", "Pinyin"]}], "senses": [{"glosses": ["to eat"]}]}, ensure_ascii=False)
    es = list(parse_entries([line, redirect, char]))
    assert [(e["headword"], e["simplified"], e["pinyin"]) for e in es] == [("學校", "学校", "xuéxiào"), ("吃", None, "chī")]
    index = build_index(es)
    assert index["学校"] == [{"lemma": es[0]["id"], "pos": "noun", "reading": "xuéxiào"}] == index["學校"]
    assert index["吃"][0]["pos"] == "verb"                 # a character entry, its part of speech read off "to eat"


def test_a_character_entry_gets_a_part_of_speech_from_its_gloss():
    from casus_build.zh.parse import char_pos
    assert char_pos("to eat; to consume") == "verb"
    assert char_pos("Used after a verb to indicate completion") == "particle"
    assert char_pos("possessive particle; of") == "particle"
    assert char_pos("I; me; my") == "pron"
    assert char_pos("book; volume") == "noun"


def test_simplified_characters_learned_from_word_pairs_and_pronouns():
    from casus_build.zh.parse import char_map, char_pos
    words = [{"headword": "學校", "simplified": "学校"}, {"headword": "書本", "simplified": "书本"}, {"headword": "他們", "simplified": "他们"}]
    m = char_map(words)
    assert m["學"] == "学" and m["書"] == "书" and "校" not in m
    assert char_pos("he; him (male third person)") == "pron"
