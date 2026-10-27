"""Japanese lessons written for Casus (2026-10-27 grammar audit): pages in the vendored book's own Markdown, English and
Portuguese side by side, spliced after a named lesson of a named topic; a rerun replaces, never duplicates."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_add_ja import lesson_of, place, questions_of  # noqa: E402

EN = """<!-- topic: ja-N5-t7 after: n5-002 -->
# ～目

**Meaning** · ordinals - the second, the third time

Add `目` to a number with its counter.

## Formation

| Number | Ordinal |
|---|---|
| {f|二|に}{f|回|かい} | {f|二|に}{f|回|かい}{f|目|め} |

## Examples

<pre>
これは<b>{f|二|に}{f|回|かい}{f|目|め}</b>です。
This is the second time.
</pre>

## Practice

**1.** {f|三|みっ}つ___の{f|駅|えき}

<details><summary>Answer</summary>
{f|目|め}
</details>
"""

PT = """<!-- topic: ja-N5-t7 after: n5-002 -->
# ～目

**Meaning** · ordinais - a segunda, a terceira vez

Acrescente `目` ao número com o seu contador.

## Formação

| Número | Ordinal |
|---|---|
| {f|二|に}{f|回|かい} | {f|二|に}{f|回|かい}{f|目|め} |

## Exemplos

<pre>
これは<b>{f|二|に}{f|回|かい}{f|目|め}</b>です。
É a segunda vez.
</pre>
"""


def test_one_lesson_from_the_english_and_portuguese_pages():
    lesson, where = lesson_of("n5-901", "N5", EN, PT)
    assert where == ("ja-N5-t7", "n5-002")
    assert lesson["id"] == "n5-901" and lesson["level"] == "N5" and lesson["ai"] is True
    assert lesson["meaning"] == {"en": "ordinals - the second, the third time", "pt": "ordinais - a segunda, a terceira vez"}
    assert "<!--" not in lesson["intro"]["en"] and "Acrescente" in lesson["intro"]["pt"]
    assert lesson["sections"][0]["id"] == "formation"
    assert lesson["sections"][0]["title"] == {"en": "Formation", "pt": "Formação"}
    assert "<ruby>目<rt>め</rt></ruby>" in lesson["sections"][0]["html"]["pt"]
    assert lesson["examples"][0]["text"] == "これは二回目です。" and lesson["examples"][0]["target"] == "二回目"
    assert lesson["examples"][0]["pt"] == "É a segunda vez."
    assert len(lesson["practice"]) == 1


def test_placed_after_the_named_lesson_and_a_rerun_replaces():
    index = {"levels": [{"id": "N5", "topics": [{"id": "ja-N5-t7", "kind": "grammar", "title": "Where",
                                                  "lessons": [{"id": "n5-001"}, {"id": "n5-002"}, {"id": "n5-003"}]}]}],
             "files": ["learn/n5-001.json"]}
    lesson, where = lesson_of("n5-901", "N5", EN, PT)
    for _ in range(2):
        place(index, lesson, where)
    t = index["levels"][0]["topics"][0]
    assert [e["id"] for e in t["lessons"]] == ["n5-001", "n5-002", "n5-901", "n5-003"]
    assert t["lessons"][2] == {"id": "n5-901", "title": "～目", "meaning": "ordinals - the second, the third time"}
    assert index["files"] == ["learn/n5-001.json", "learn/n5-901.json", "learn/q-n5-901.json"]


def test_questions_like_the_books_lessons():
    lesson, _ = lesson_of("n5-901", "N5", EN, PT)
    q = questions_of(lesson, ["二回目", "から"])
    # as in the book's lessons, a bold part with furigana gets no gap here (learn_examples.mjs adds gaps by words)
    kinds = [x["type"] for x in q["qs"]]
    assert kinds == ["translate", "meaning"]
    assert q["qs"][0]["answer"] == "This is the second time." and q["qs"][1]["answer"] == "ordinals - the second, the third time"
    assert q["pools"]["gap"] == ["二回目", "から"]
    assert json.dumps(q, ensure_ascii=False)
