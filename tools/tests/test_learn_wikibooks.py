import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learn_wikibooks import clean, wikibooks_lessons  # noqa: E402

PAGE = """<div class="mw-parser-output"><table class="ambox"><tr><td>This page needs work</td></tr></table>
<h2><span class="mw-headline">Nouns</span></h2><p>Russian nouns have <b>six cases</b>. See <a href="/wiki/Russian/Grammar">grammar</a>.</p>
<table class="wikitable"><tr><td>стол</td></tr></table><style>.x{}</style>
<div class="noprint">nav</div><div role="navigation" class="navbox">box</div>""" + "<p>" + "Text. " * 80 + "</p></div>"


def test_clean_keeps_the_content_and_drops_boxes():
    h = clean(PAGE)
    assert "six cases" in h and "wikitable" in h and "стол" in h
    assert "ambox" not in h and "needs work" not in h and "noprint" not in h and "navbox" not in h and "<style" not in h
    assert 'href="https://en.wikibooks.org/wiki/Russian/Grammar"' in h and "<h4>" in h


def test_lessons_from_a_book_skip_stubs():
    pages = [{"title": "Russian/Lesson 1", "html": PAGE}, {"title": "Russian/Stub", "html": "<p>Soon.</p>"}]
    index = {"levels": [{"id": "A1", "topics": []}, {"id": "A2", "topics": []}]}
    lessons, questions = {}, {"A1": {}, "A2": {}}
    n = wikibooks_lessons("ru", "Russian", pages, index, lessons, questions)
    assert n == 1 and lessons["ru-wb-1"]["title"] == "Lesson 1"
    assert "Wikibooks" in lessons["ru-wb-1"]["source"] and "CC BY-SA" in lessons["ru-wb-1"]["source"]
