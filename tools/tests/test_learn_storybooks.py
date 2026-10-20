import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_storybooks import parse_story, storybook_lessons  # noqa: E402

MD = """# Ein sehr großer Mann

##
Seine Hacke war zu kurz.

##
Dieser Mann war zu groß!

##
* License: [CC-BY]
* Text: Cornelius Gulere
* Illustration: Catherine Groenewald
* Translation: Lisa Birkner
"""


def test_parse_story_pages_and_credits():
    s = parse_story(MD)
    assert s["title"] == "Ein sehr großer Mann"
    assert s["pages"] == ["Seine Hacke war zu kurz.", "Dieser Mann war zu groß!"]
    assert s["licence"] == "CC-BY" and s["credits"]["Text"] == "Cornelius Gulere" and s["credits"]["Translation"] == "Lisa Birkner"


def test_only_cc_by_stories_become_lessons_shortest_first(tmp_path):
    (tmp_path / "0001_a.md").write_text(MD, encoding="utf-8")
    (tmp_path / "0002_b.md").write_text(MD.replace("CC-BY]", "CC-BY-NC]"), encoding="utf-8")
    index = {"levels": [{"id": "A1", "topics": []}, {"id": "A2", "topics": []}]}
    lessons, questions = {}, {}
    n = storybook_lessons("de", [tmp_path], index, lessons, questions)
    assert n == 1
    page = next(iter(lessons.values()))
    assert page["read"] == "Seine Hacke war zu kurz.\nDieser Mann war zu groß!"
    assert 'class="say"' in page["sections"][0]["html"]["en"] and "Cornelius Gulere" in page["intro"]["en"] and "CC BY 4.0" in page["intro"]["en"]
