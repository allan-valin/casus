import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_learn import ja_learn, units_of  # noqa: E402

FIX = Path(__file__).parent / "fixtures"
VOCAB = "id,word,reading,romaji,meanings,level,pos,jmdict_id,other_forms,example_ja,example_en\n" + "\n".join(f"v{k},語{k},ご{k},go{k},word {k},N5,n,1,,," for k in range(35))
KANJI = "character,level,strokes,grade,freq,radical,radical_number,onyomi,kunyomi,nanori,meanings,words,supplementary\n日,N5,4,1,1,日,72,ニチ; ジツ,ひ; -び,,day; sun,明日; 今日,\n"


def test_units_are_small_groups_in_order():
    assert [len(u) for u in units_of(list(range(13)), 6)] == [6, 7]


def book(tmp: Path) -> Path:
    b = tmp / "book"
    (b / "n5").mkdir(parents=True)
    for n in ("n4", "n3", "n2", "n1"):
        (b / n).mkdir()
    page = (FIX / "jge-mo.md").read_text(encoding="utf-8")
    (b / "n5" / "005-も.md").write_text(page, encoding="utf-8")
    (b / "n5" / "004-は.md").write_text(page.replace("# も", "# は").replace("also; too; as well", "as for; topic").replace("<b>も</b>", "<b>は</b>"), encoding="utf-8")
    (b / "SUMMARY.md").write_text("# N5 - Beginner\n\n- [N5](./n5/index.md)\n  - [Saying what something is]()\n    - [は](./n5/004-は.md)\n    - [も](./n5/005-も.md)\n", encoding="utf-8")
    return b


def test_japanese_levels_topics_lessons_and_questions(tmp_path):
    oj = tmp_path / "oj"
    oj.mkdir()
    for n in ("n5", "n4", "n3", "n2", "n1"):
        (oj / f"vocab-{n}.csv").write_text(VOCAB if n == "n5" else VOCAB.split("\n")[0] + "\n", encoding="utf-8")
        (oj / f"kanji-{n}.csv").write_text(KANJI if n == "n5" else KANJI.split("\n")[0] + "\n", encoding="utf-8")
    index, lessons, questions = ja_learn(book(tmp_path), oj)
    n5 = index["levels"][0]
    assert n5["id"] == "N5"
    topic = n5["topics"][0]
    assert topic["title"] == "Saying what something is" and topic["kind"] == "grammar"
    assert [(l["id"], l["title"], l["meaning"]) for l in topic["lessons"]] == [("n5-004", "は", "as for; topic"), ("n5-005", "も", "also; too; as well")]
    assert {t["kind"] for t in n5["topics"]} == {"grammar", "vocab", "kanji"}
    mo = lessons["n5-005"]
    assert mo["examples"][0]["target"] == "も" and len(mo["practice"]) == 2 and mo["level"] == "N5" and mo["topic"] == "Saying what something is"
    f = questions["N5"]["n5-005"]
    qs = f["qs"]
    gap = next(q for q in qs if q["type"] == "gap")
    assert gap["answer"] == "も" and ["＿＿", None] in gap["furi"] and "は" in f["pools"]["gap"]
    assert any(q["type"] == "translate" and q["answer"] == "I'll go too." for q in qs)
    assert any(q["type"] == "meaning" and q["answer"] == "also; too; as well" for q in qs)
