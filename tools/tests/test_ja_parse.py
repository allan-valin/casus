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


def test_a_kana_entry_indexes_its_kanji_spelling_and_a_rare_reading_goes_last():
    uo = json.loads(entry("魚", "noun", "魚(うお) • (uo)", gloss="fish"))
    uo["senses"][0]["tags"] = ["uncommon"]
    sakana = entry("さかな", "noun", "さかな • (sakana)", gloss="fish", forms=[{"form": "魚", "tags": ["alternative", "kanji"]}])
    gyo = entry("魚", "noun", "魚(ぎょ) • (gyo)", gloss="a fish")
    index = build_index(list(parse_entries([json.dumps(uo, ensure_ascii=False), gyo, sakana])))
    assert [a.get("reading") for a in index["魚"]] == ["さかな", "ぎょ", "うお"]


def test_a_commoner_reading_goes_first():
    atashi = entry("あたし", "pron", "あたし • (atashi)", gloss="I", forms=[{"form": "私", "tags": ["alternative", "kanji"]}])
    watashi = entry("私", "pron", "私(わたし) • (watashi)", gloss="I")
    index = build_index(list(parse_entries([atashi, watashi])), reading_rank={"私\tわたし": 10, "私\tあたし": 400})
    assert [a.get("reading") for a in index["私"]] == ["わたし", "あたし"]


def test_proper_nouns_are_words():
    # Allan 2026-10-27: 日本 read as 日 (ひ) + 本 (ほん) = "hi hon" — Wiktionary files place names under "name", which
    # the build dropped. Names of two or more characters with kanji or katakana are kept as nouns; a one-character or
    # hiragana-only name would match inside ordinary words.
    lines = [
        entry("日本", "name", "日(に)本(ほん) • (Nihon)", name="ja-noun"),
        entry("トム", "name", "トム • (Tomu)", name="ja-noun"),
        entry("さくら", "name", "さくら • (Sakura)", name="ja-noun"),
        entry("森", "name", "森(もり) • (Mori)", name="ja-noun"),
    ]
    entries = list(parse_entries(lines))
    assert [(e["headword"], e["pos"], e["reading"]) for e in entries] == [("日本", "noun", "にほん"), ("トム", "noun", "トム")]


def test_a_textbook_reading_ranks_before_its_twin(tmp_path=None):
    # the JLPT list has 日本 にっぽん before 日本 にほん; only にほん is tagged with a textbook (Genki) → にほん first
    import tempfile
    from casus_build.ja.parse import jlpt_ranks
    d = Path(tempfile.mkdtemp())
    (d / "jlpt_n3.csv").write_text("expression,reading,meaning,tags,guid\n日本,にっぽん,Japan,JLPT JLPT_3,a\n"
                                   "日本,にほん,Japan,JLPT JLPT_3 Genki_Ln.1 Genki,b\n", encoding="utf-8")
    r = jlpt_ranks(d)
    assert r["日本\tにほん"] < r["日本\tにっぽん"]
