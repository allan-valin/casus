"""translating imported (human-written) Learn pages into every interface language (Allan, 2026-10-20)"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import translate_learn as T  # noqa: E402


class Fake:
    """a stand-in model: upper-cases what it is given, so a test sees what was sent"""
    def __init__(self, ui):
        self.ui, self.new, self.sent = ui, 0, []

    def __call__(self, texts):
        self.sent += texts
        return [f"<{self.ui}>{t}" for t in texts]

    def save(self):
        pass


def page(tmp, name, **kw):
    d = tmp / "xx" / "learn"
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{name}.json").write_text(json.dumps(kw), encoding="utf-8")
    return d / f"{name}.json"


def test_the_explanation_language_comes_from_the_source():
    assert T.source_language({"source": "Wikibooks (fr), Grec ancien (CC BY-SA 4.0)"}) == "fr"
    assert T.source_language({"source": "Wikiversity (ja), 日本語"}) == "ja"
    assert T.source_language({"source": "Philip S. Peek, Ancient Greek I, CC BY 4.0"}) == "en"
    assert T.source_language({"source": "Global Storybooks, CC BY 4.0"}) is None
    assert T.source_language({"source": "Kanstantsin Tsedryk, Grammaire française (Waterloo), CC BY-SA 4.0"}) == "fr"


def test_a_french_page_is_translated_to_portuguese_and_keeps_its_original(tmp_path, monkeypatch):
    body = "<p>Le présent de <b>λύω</b> se forme avec les terminaisons du présent.</p>"
    f = page(tmp_path / "data", "grc-wb1", source="Wikibooks (fr), Grec ancien", title="Le présent",
             meaning={"en": "Le présent", "pt": "Le présent"}, sections=[{"id": "book", "title": {"en": "The lesson", "pt": "A lição"},
             "html": {"en": body, "pt": body}}])
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    tr = Fake("pt")
    assert T.translate_language("xx", tr) == 1
    p = json.loads(f.read_text())
    assert p["mt"] == {"pt": "MADLAD-400"} and p["src"] == "fr"
    html = p["sections"][0]["html"]
    assert html["en"] == body and html["pt"].startswith("<p><pt>") and "<b>λύω</b>" in html["pt"]


def test_into_english_the_original_moves_to_orig(tmp_path, monkeypatch):
    body = "<p>Le présent de <b>λύω</b> se forme avec les terminaisons du présent.</p>"
    f = page(tmp_path / "data", "grc-wb1", source="Wikibooks (fr), Grec ancien", sections=[{"id": "book", "html": {"en": body, "pt": body}}])
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    T.translate_language("xx", Fake("en"))
    html = json.loads(f.read_text())["sections"][0]["html"]
    assert html["orig"] == body and html["en"].startswith("<p><en>")


def test_ai_written_storybook_and_same_language_pages_are_left_alone(tmp_path, monkeypatch):
    body = "<p>Le présent se forme avec les terminaisons du présent.</p>"
    page(tmp_path / "data", "a", source="Wikibooks (fr), X", ai=True, sections=[{"id": "b", "html": {"en": body}}])
    page(tmp_path / "data", "b", source="Global Storybooks, CC BY 4.0", sections=[{"id": "b", "html": {"en": body}}])
    page(tmp_path / "data", "c", source="Wikibooks (pt), X", sections=[{"id": "b", "html": {"en": body}}])
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    tr = Fake("pt")
    assert T.translate_language("xx", tr) == 0 and tr.sent == []
