import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from casus_build.ja.parse import furigana, parse_entries, build_index  # noqa: E402


def test_furigana_segments_from_the_head_line():
    assert furigana("学(がっ)校(こう) • (gakkō)") == [["学", "がっ"], ["校", "こう"]]
    assert furigana("食(た)べ物(もの) • (tabemono)") == [["食", "た"], ["べ", None], ["物", "もの"]]
    assert furigana("食(た)べる • (taberu) transitive ichidan") == [["食", "た"], ["べる", None]]
    assert furigana("行(い)く or 行(ゆ)く • (iku or yuku)") == [["行", "い"], ["く", None]]
    assert furigana("今日(きょう) • (kyō)") == [["今日", "きょう"]]
    assert furigana("する • (suru)") == [["する", None]]


def entry(word, pos, expansion, args=None, name="ja-noun", forms=(), gloss="x", ipa=None):
    return json.dumps({"word": word, "lang_code": "ja", "pos": pos, "head_templates": [{"name": name, "args": args or {}, "expansion": expansion}],
                       "forms": list(forms), "senses": [{"glosses": [gloss]}], "sounds": [{"ipa": ipa}] if ipa else []}, ensure_ascii=False)


def test_entries_and_index():
    lines = [
        entry("食べる", "verb", "食(た)べる • (taberu) transitive ichidan", {"1": "たべる", "type": "2"}, "ja-verb",
              [{"form": "食べさせる", "tags": ["causative"]}, {"form": "tabesaseru", "tags": ["causative", "romanization"]}], "to eat", "[ta̠be̞ɾɯ̟]"),
        entry("学校", "noun", "学(がっ)校(こう) • (gakkō)", gloss="school"),
        entry("は", "particle", "は • (wa)", name="ja-pos", gloss="topic marker"),
        entry("taberu", "romanization", "taberu"),
    ]
    entries = list(parse_entries(lines))
    assert [e["headword"] for e in entries] == ["食べる", "学校", "は"]
    eat = entries[0]
    assert eat["reading"] == "たべる" and eat["cls"] == "ichidan" and eat["furi"] == [["食", "た"], ["べる", None]] and eat["ipa"]
    index = build_index(entries)
    assert {"lemma": eat["id"], "pos": "verb", "form": "politepast", "reading": "たべました"} in index["食べました"]
    assert {"lemma": eat["id"], "pos": "verb", "form": "politepast"} in index["たべました"]       # kana-only text is found
    assert {"lemma": eat["id"], "pos": "verb", "form": "caus", "reading": "たべさせる"} in index["食べさせる"]
    assert "tabesaseru" not in index
    assert index["がっこう"] == [{"lemma": entries[1]["id"], "pos": "noun", "form": "kana"}]
    assert index["は"] == [{"lemma": entries[2]["id"], "pos": "particle"}]


def test_codes_round_trip():
    from casus_build.ja.codes import encode_analysis, decode_analysis
    for a in ({"pos": "verb", "form": "politepast"}, {"pos": "noun"}, {"pos": "adj", "form": "neg"}, {"pos": "particle"}):
        assert decode_analysis(encode_analysis(a), "7") == {"lemma": "7", **a}


def test_kana_spellings_of_kanji_words_are_marked_and_suru_nouns_conjugate():
    lines = [entry("歯", "noun", "歯(は) • (ha)", gloss="tooth"), entry("は", "particle", "は • (wa)", name="ja-pos", gloss="topic marker"),
             entry("勉強", "verb", "勉(べん)強(きょう) • (benkyō)", {}, "ja-verb-suru", gloss="to study")]
    entries = list(parse_entries(lines))
    index = build_index(entries)
    assert {"lemma": entries[0]["id"], "pos": "noun", "form": "kana"} in index["は"]
    assert {"lemma": entries[1]["id"], "pos": "particle"} in index["は"]
    assert {"lemma": entries[2]["id"], "pos": "verb", "form": "politepast", "reading": "べんきょうしました"} in index["勉強しました"]
    assert {"lemma": entries[2]["id"], "pos": "verb", "form": "politepast"} in index["べんきょうしました"]


def test_each_kanji_form_carries_its_reading():
    from casus_build.ja.parse import reading_of
    furi = [["食", "た"], ["べる", None]]
    assert reading_of("食べました", "食べる", furi) == "たべました"
    assert reading_of("学校", "学校", [["学", "がっ"], ["校", "こう"]]) == "がっこう"
    assert reading_of("来ない", "来る", [["来", "く"], ["る", None]], "kuru") == "こない"
    assert reading_of("来ます", "来る", [["来", "く"], ["る", None]], "kuru") == "きます"
    assert reading_of("たべる", "食べる", furi) is None                     # kana needs no reading
    lines = [entry("食べる", "verb", "食(た)べる • (taberu) transitive ichidan", {"1": "たべる", "type": "2"}, "ja-verb", gloss="to eat")]
    entries = list(parse_entries(lines))
    assert {"lemma": entries[0]["id"], "pos": "verb", "form": "politepast", "reading": "たべました"} in build_index(entries)["食べました"]
