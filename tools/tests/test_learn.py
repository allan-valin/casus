import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_learn import ja_learn, units_of  # noqa: E402

GRAMMAR = "id,pattern,reading,romaji,level,meaning,formation,example_ja,example_en,tags,notes\n" + "\n".join(
    f"g{k},〜p{k},,p{k},N5,meaning {k},Noun + p{k},例{k}です。,Example {k}.,particle,note {k}" for k in range(8))
VOCAB = "id,word,reading,romaji,meanings,level,pos,jmdict_id,other_forms,example_ja,example_en\n" + "\n".join(
    f"v{k},語{k},ご{k},go{k},word {k},N5,n,1,,,"for k in range(35))
KANJI = "character,level,strokes,grade,freq,radical,radical_number,onyomi,kunyomi,nanori,meanings,words,supplementary\n日,N5,4,1,1,日,72,ニチ; ジツ,ひ; -び,,day; sun,明日; 今日,\n"


def test_units_are_small_groups_in_order():
    assert [len(u) for u in units_of(list(range(13)), 6)] == [6, 7]          # a short tail joins the last unit
    assert [len(u) for u in units_of(list(range(14)), 6)] == [6, 6, 2] or [len(u) for u in units_of(list(range(14)), 6)] == [6, 8]


def test_japanese_levels_units_and_lessons(tmp_path):
    for n in ("n5", "n4", "n3", "n2", "n1"):
        (tmp_path / f"grammar-{n}.csv").write_text(GRAMMAR if n == "n5" else GRAMMAR.split("\n")[0] + "\n", encoding="utf-8")
        (tmp_path / f"vocab-{n}.csv").write_text(VOCAB if n == "n5" else VOCAB.split("\n")[0] + "\n", encoding="utf-8")
        (tmp_path / f"kanji-{n}.csv").write_text(KANJI if n == "n5" else KANJI.split("\n")[0] + "\n", encoding="utf-8")
    out = ja_learn(tmp_path)
    assert out["system"] == "JLPT" and [lv["id"] for lv in out["levels"]] == ["N5", "N4", "N3", "N2", "N1"]
    n5 = out["levels"][0]
    kinds = [u["kind"] for u in n5["units"]]
    assert kinds.count("grammar") == 1 and kinds.count("vocab") == 1 and kinds.count("kanji") == 1
    g = n5["units"][0]["lessons"][0]
    assert g == {"id": "ja-g0", "kind": "grammar", "pattern": "〜p0", "romaji": "p0", "meaning": {"en": "meaning 0"}, "formation": "Noun + p0",
                 "examples": [{"text": "例0です。", "en": "Example 0."}], "notes": {"en": "note 0"}, "source": "OpenJLPT"}
    v = [u for u in n5["units"] if u["kind"] == "vocab"][0]["lessons"][0]
    assert v["kind"] == "vocab" and len(v["words"]) == 35 and v["words"][0] == {"w": "語0", "reading": "ご0", "en": "word 0"}
