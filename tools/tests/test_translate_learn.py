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
        return [f"«{self.ui}»{t}" for t in texts]

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
    assert html["en"] == body and html["pt"].startswith("<p>«pt»") and "<b>λύω</b>" in html["pt"]


def test_into_english_the_original_moves_to_orig(tmp_path, monkeypatch):
    body = "<p>Le présent de <b>λύω</b> se forme avec les terminaisons du présent.</p>"
    f = page(tmp_path / "data", "grc-wb1", source="Wikibooks (fr), Grec ancien", sections=[{"id": "book", "html": {"en": body, "pt": body}}])
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    T.translate_language("xx", Fake("en"))
    html = json.loads(f.read_text())["sections"][0]["html"]
    assert html["orig"] == body and html["en"].startswith("<p>«en»")


def test_ai_written_storybook_and_same_language_pages_are_left_alone(tmp_path, monkeypatch):
    body = "<p>Le présent se forme avec les terminaisons du présent.</p>"
    page(tmp_path / "data", "a", source="Wikibooks (fr), X", ai=True, sections=[{"id": "b", "html": {"en": body}}])
    page(tmp_path / "data", "b", source="Global Storybooks, CC BY 4.0", sections=[{"id": "b", "html": {"en": body}}])
    page(tmp_path / "data", "c", source="Wikibooks (pt), X", sections=[{"id": "b", "html": {"en": body}}])
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    tr = Fake("pt")
    assert T.translate_language("xx", tr) == 0 and tr.sent == []


def test_cache_only_reapplies_known_translations_and_skips_the_rest(tmp_path, monkeypatch):
    """after a rebuild, translations come back from the cache without the model; a field with any sentence not in
    the cache stays as it was (no half-translated section)"""
    known = "<p>Le présent se forme avec les terminaisons du présent.</p>"
    unknown = "<p>Le passé se forme avec les terminaisons du passé simple.</p>"
    f = page(tmp_path / "data", "p", source="Wikibooks (fr), X", sections=[{"id": "a", "html": {"en": known}}, {"id": "b", "html": {"en": unknown}}])
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    tr = T.CacheOnly("pt", {"Le présent se forme avec les terminaisons du présent.": "O presente forma-se com as terminações do presente."})
    assert T.translate_language("xx", tr) == 1
    secs = json.loads(f.read_text())["sections"]
    assert secs[0]["html"]["pt"] == "<p>O presente forma-se com as terminações do presente.</p>" and "pt" not in secs[1]["html"]


def test_a_lost_placeholder_is_retried_with_braces():
    tr = object.__new__(T.Translator)
    tr.ui, tr.cache, tr.new, tr.cache_file = "pt", {}, 0, None
    tr.save = lambda: None
    calls = []

    def model(texts):
        calls.append(texts)
        # the first try drops [2]; the brace try keeps {1} {2}
        return [t.replace("It is", "É").replace(" [2]", "") if "[" in t else t.replace("It is", "É") for t in texts]
    tr._model = model
    assert tr(["It is [1] and [2]."]) == ["É [1] and [2]."]
    assert calls[1] == ["It is {1} and {2}."]


def test_redo_replaces_an_earlier_translation(tmp_path, monkeypatch):
    body = "<p>Le présent se forme avec les terminaisons du présent.</p>"
    f = page(tmp_path / "data", "p", source="Wikibooks (fr), X", mt={"pt": "MADLAD-400"}, src="fr",
             sections=[{"id": "a", "html": {"en": body, "pt": "<p>velha tradução</p>"}}])
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    assert T.translate_language("xx", Fake("pt"), redo=True) == 1
    assert json.loads(f.read_text())["sections"][0]["html"]["pt"].startswith("<p>«pt»")


def test_a_very_long_sentence_is_cut_at_commas():
    long = "Words: " + ", ".join(f"word{n}" for n in range(200)) + "."
    parts = T.pieces_of(long)
    assert len(parts) > 1 and all(len(p) <= 600 for p in parts) and "".join(parts) == long


def test_out_of_memory_halves_the_batch_and_a_hopeless_sentence_keeps_its_original():
    tr = object.__new__(T.Translator)
    tr.ui = "pt"

    def raw(texts):
        if len(texts) > 1 or "HUGE" in texts[0]:
            raise RuntimeError("CUDA failed with error out of memory")
        return [f"<pt>{texts[0]}"]
    tr._raw = raw
    assert tr._model(["a", "b", "HUGE c"]) == ["<pt>a", "<pt>b", "HUGE c"]


def test_the_model_input_ends_with_the_end_of_sequence_token():
    """without </s> MADLAD keeps writing after the sentence ("…, como se fosse um livro"): found 2026-10-20"""
    tr = object.__new__(T.Translator)
    tr.ui = "pt"
    seen = []

    class SP:
        def encode(self, text, out_type=str):
            return text.split()

        def decode(self, toks):
            return " ".join(toks)

    class Model:
        def translate_batch(self, toks, **kw):
            seen.extend(toks)
            return [type("R", (), {"hypotheses": [t[1:-1]]})() for t in toks]
    tr.sp, tr.model = SP(), Model()
    tr._raw(["Hello there"])
    assert seen[0][-1] == "</s>" and seen[0][0] == "<2pt>"


def test_lines_are_translated_one_by_one():
    assert T.pieces_of("Acorns may measure heights,\nthough varying very little.") == ["Acorns may measure heights,\n", "though varying very little."]


def test_an_output_far_longer_than_its_input_is_not_trusted():
    tr = object.__new__(T.Translator)
    tr.ui, tr.cache, tr.new, tr.cache_file = "pt", {}, 0, None
    tr.save = lambda: None
    tr._model = lambda texts: ["Por que " * 30 if "Why" in t else "Bom dia." for t in texts]
    assert tr(["Why do they differ?", "Good morning."]) == ["Why do they differ?", "Bom dia."]


def test_a_proofread_correction_wins_over_the_model(tmp_path, monkeypatch):
    """tools/mt_fixes/<ui>.yml: sentences corrected by proofreading, kept in git (the cache is not)"""
    (tmp_path / "tools" / "mt_fixes").mkdir(parents=True)
    (tmp_path / "tools" / "mt_fixes" / "pt.yml").write_text('"A connective ending used to mean [1].": "Uma terminação conectiva usada para dizer [1]."\n', encoding="utf-8")
    monkeypatch.setattr(T, "ROOT", tmp_path)
    tr = T.CacheOnly("pt", {"A connective ending used to mean [1].": "Uma terminação costumava significar [1]."})
    assert tr(["A connective ending used to mean [1]."]) == ["Uma terminação conectiva usada para dizer [1]."]


def test_a_meaning_with_entities_reaches_the_model_as_plain_text():
    tr = Fake("pt")
    obj = {"en": "A connective ending used to mean &quot;as&quot; in a sentence."}
    T.text_field(obj, tr, "en")
    assert tr.sent == ['A connective ending used to mean "as" in a sentence.'] and "&quot;as&quot;" in obj["pt"]


def test_redo_also_replaces_the_index_meanings(tmp_path, monkeypatch):
    body = "<p>Le présent se forme avec les terminaisons du présent.</p>"
    page(tmp_path / "data", "p1", id="p1", source="Wikibooks (fr), X", mt={"pt": "MADLAD-400"}, src="fr",
         sections=[{"id": "a", "html": {"en": body, "pt": "<p>velha</p>"}}])
    idx = {"levels": [{"id": "A1", "topics": [{"title": {"en": "T"}, "lessons": [{"id": "p1", "meaning": {"en": "le présent", "pt": "velho"}}]}]}]}
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps(idx))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    T.translate_language("xx", Fake("pt"), redo=True)
    assert json.loads((tmp_path / "data" / "xx" / "learn.json").read_text())["levels"][0]["topics"][0]["lessons"][0]["meaning"]["pt"] == "«pt»le présent"


def test_a_page_with_plain_string_fields_is_translated_too(tmp_path, monkeypatch):
    """JLPT Grammar Enhanced pages keep meaning, intro and section html as plain English strings"""
    intro = "<p><code>は</code> does not mean anything by itself and marks the topic of the sentence.</p>"
    f = page(tmp_path / "data", "n5-004", id="n5-004", source="JLPT Grammar Enhanced (CC BY-SA 4.0)", meaning="marks the topic",
             intro=intro, topic="Saying what something is",
             sections=[{"id": "formation", "title": "Formation", "html": "<p>It attaches to a noun with no change to the noun at all.</p>"}])
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    assert T.translate_language("xx", Fake("pt")) == 1
    p = json.loads(f.read_text())
    assert p["meaning"] == {"en": "marks the topic", "pt": "«pt»marks the topic"}
    assert p["intro"]["en"] == intro and "«pt»" in p["intro"]["pt"] and "<code>は</code>" in p["intro"]["pt"]
    assert p["sections"][0]["html"]["pt"].startswith("<p>«pt»") and p["sections"][0]["title"]["pt"] == "«pt»Formation"
