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


def test_a_book_from_another_wikibooks_edition_links_there_and_says_its_language():
    from learn_wikibooks import wikibooks_lessons
    index = {"levels": [{"id": "A1", "topics": []}, {"id": "A2", "topics": []}]}
    lessons, questions = {}, {}
    body = "<p>" + "Os adjetivos em inglês vêm antes do substantivo. " * 10 + '<a href="/wiki/Ingl%C3%AAs/Gram%C3%A1tica">x</a></p>'
    pages = [{"title": "Inglês/Gramática/Adjetivos", "html": body}, {"title": "Inglês/Curso/Lição 1", "html": body}]
    n = wikibooks_lessons("en", "Inglês", pages, index, lessons, questions, edition="pt", prefix="en-wbpt")
    assert n == 2
    page = lessons["en-wbpt-1"]
    assert "https://pt.wikibooks.org/wiki/Ingl%C3%AAs/Gram%C3%A1tica" in page["sections"][0]["html"]["en"]
    assert "https://pt.wikibooks.org/wiki/Ingl" in page["intro"]["en"]
    assert "Portuguese" in page["intro"]["en"] and "português" in page["intro"]["pt"]
    assert page["source"].startswith("Wikibooks (pt)")
    titles = [tp["title"]["en"] for lv in index["levels"] for tp in lv["topics"]]
    assert all(t.startswith("Wikibooks (Português)") for t in titles)


def test_clean_drops_maintenance_boxes_without_a_class():
    box = ('<table style="border:1px solid #cedff2"><tr><td><a href="/wiki/Ficheiro:Wikibooks-logo-pt.svg"></a></td>'
           '<td>Este livro ou módulo precisa ser formatado segundo o modelo wiki.</td></tr></table>')
    h = clean(box + "<p>Os adjetivos vêm antes.</p>", "pt")
    assert "precisa ser formatado" not in h and "Os adjetivos" in h
    data = '<table class="wikitable"><tr><td>book</td><td>livro</td></tr></table>'
    assert "livro" in clean(data, "pt")


def test_a_wikisource_book_is_credited_as_a_public_domain_text_there():
    from learn_wikibooks import wikibooks_lessons
    index = {"levels": [{"id": "Reference", "topics": []}]}
    lessons, questions = {}, {}
    body = "<p>" + "Le nom est un mot qui sert à désigner. " * 12 + "</p>"
    n = wikibooks_lessons("fr", "L’Année préparatoire de Grammaire", [{"title": "L’Année préparatoire de Grammaire/Le nom", "html": body}],
                          index, lessons, questions, edition="fr", prefix="fr-ws1", site="wikisource")
    page = lessons["fr-ws1-1"]
    assert n == 1 and "fr.wikisource.org/wiki/" in page["intro"]["en"]
    assert "Wikisource" in page["intro"]["en"] and "public domain" in page["intro"]["en"] and "CC BY-SA" not in page["intro"]["en"]
    assert page["source"].startswith("Wikisource (fr)")
    assert index["levels"][0]["topics"][0]["title"]["en"].startswith("Wikisource (Français)")
