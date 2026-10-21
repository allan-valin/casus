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


def test_a_soft_line_break_inside_a_paragraph_does_not_cut_the_sentence():
    """JLPT Grammar Enhanced wraps its lines: cutting there gave fragments ('[2] takes it as the') to the model
    (2026-10-20); a real break is <br> or a new block, which already splits the text"""
    assert T.pieces_of("[2] takes it as the\nsecond half in [1].  It rained.") == ["[2] takes it as the second half in [1].", "It rained."]


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


def test_a_long_japanese_sentence_is_cut_shorter_at_its_commas():
    """a CJK character is about one token, so the cut is at 200 characters, at 、 or ，"""
    long = "、".join(["これは長い文の一部です"] * 40) + "。"
    parts = T.pieces_of(long)
    assert len(parts) > 1 and all(len(p) <= 200 for p in parts) and "".join(parts) == long


def test_the_batch_shrinks_when_the_inputs_are_long():
    """16 short sentences fit the 6 GB GPU; 16 of 361 tokens did not (a CUDA error, 2026-10-20)"""
    tr = object.__new__(T.Translator)
    tr.ui = "pt"
    sizes = []

    class SP:
        def encode(self, text, out_type=str):
            return text.split()

        def decode(self, toks):
            return " ".join(toks)

    class Model:
        def translate_batch(self, toks, **kw):
            sizes.append(kw["max_batch_size"])
            return [type("R", (), {"hypotheses": [t]})() for t in toks]
    tr.sp, tr.model = SP(), Model()
    tr._raw(["short one"] * 20)
    tr._raw(["word " * 360] * 20)
    assert sizes[0] == 16 and sizes[1] <= 8


def test_a_japanese_sentence_may_have_a_much_longer_translation():
    """Japanese is dense: 「双括式」 explained in Portuguese is three times longer and still right"""
    tr = object.__new__(T.Translator)
    tr.ui, tr.cache, tr.new, tr.cache_file = "pt", {}, 0, None
    tr.save = lambda: None
    ja = "結論が冒頭と最後の両方に書かれる文章構成を双括式と言います。"
    pt = "A estrutura de texto em que a conclusão aparece tanto no começo quanto no fim chama-se estrutura de dupla conclusão."
    tr._model = lambda texts: [pt for _ in texts]
    assert tr([ja]) == [pt]


def test_an_example_without_a_translation_gets_one(tmp_path, monkeypatch):
    """the NIKL dictionary gives Korean examples with no translation (Allan, 2026-10-20: 'no indication about what
    the meaning is supposed to be'): each gets a machine-translated line, in every interface language"""
    intro = '<p><b>이, 가</b> — a particle.</p><div class="ex"><p class="ja">오늘 밤은 달이 참 밝다.</p></div>'
    f = page(tmp_path / "data", "ko-nikl-1", id="ko-nikl-1", source="NIKL grammar list; 한국어기초사전 (NIKL, CC BY-SA 2.0 KR)", intro={"en": intro})
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    T.translate_language("xx", Fake("pt"))
    T.translate_language("xx", Fake("en"))
    i = json.loads(f.read_text())["intro"]
    assert '<p class="en gloss">«pt»오늘 밤은 달이 참 밝다.</p></div>' in i["pt"]
    assert '<p class="en gloss">«en»오늘 밤은 달이 참 밝다.</p></div>' in i["en"] and i["orig"] == intro


def test_an_example_that_has_its_meaning_gets_no_second_one():
    ex = '<div class="ex"><p class="ja">今日は寒い。</p><p class="en">It is cold today.</p></div>'
    assert T.gloss_examples(ex, Fake("pt")) == ex


def test_a_japanese_or_korean_explanation_goes_through_english():
    """MADLAD made things up from Japanese straight into Portuguese ('A palavra "a" é usada…'); through English it is
    right (2026-10-20)"""
    tr = object.__new__(T.Translator)
    tr.ui, tr.cache, tr.new, tr.cache_file, tr.src = "pt", {}, 0, None, "ja"
    tr.en_cache = {}
    tr.save = lambda: None
    calls = []

    def raw(texts, ui=None, beam=2):
        calls.append(ui)
        return [f"«{ui}»{t}" for t in texts]
    tr._raw = raw
    assert tr(["今で言う岩手県の一地方。"]) == ["«pt»«en»今で言う岩手県の一地方。"]
    assert calls == ["en", "pt"] and tr.en_cache == {"今で言う岩手県の一地方。": "«en»今で言う岩手県の一地方。"}


def test_redo_also_replaces_the_intro(tmp_path, monkeypatch):
    intro = "<p>Le présent se forme avec les terminaisons du présent.</p>" * 8
    f = page(tmp_path / "data", "p", source="Wikibooks (fr), X", mt={"pt": "MADLAD-400"}, src="fr", intro={"en": intro, "pt": "<p>velha</p>"})
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    T.translate_language("xx", Fake("pt"), redo=True)
    assert json.loads(f.read_text())["intro"]["pt"].startswith("<p>«pt»")


def test_fixes_also_come_from_a_folder_per_language(tmp_path, monkeypatch):
    """a book translated by Claude has its own file: tools/mt_fixes/<ui>/<book>.yml"""
    (tmp_path / "tools" / "mt_fixes" / "pt").mkdir(parents=True)
    (tmp_path / "tools" / "mt_fixes" / "pt" / "jlpt.yml").write_text('"It is cold.": "Está frio."\n', encoding="utf-8")
    monkeypatch.setattr(T, "ROOT", tmp_path)
    assert T.fixes("pt") == {"It is cold.": "Está frio."}


def test_the_pieces_a_book_sends_can_be_listed_without_the_model(tmp_path, monkeypatch):
    """tools/mt_pieces.py: the exact sentences (with placeholders) a book needs translated, for Claude to translate"""
    body = "<p>The particle <b>は</b> marks the topic. It is cold today.</p>"
    page(tmp_path / "data", "n5-1", id="n5-1", source="JLPT Grammar Enhanced (CC BY-SA 4.0)", sections=[{"id": "a", "html": {"en": body}}])
    page(tmp_path / "data", "x-1", id="x-1", source="Wikibooks (fr), X", sections=[{"id": "a", "html": {"en": "<p>Le présent se forme avec les terminaisons.</p>"}}])
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    pieces = T.pieces_for("xx", "pt", "JLPT")
    assert pieces == ["The particle [1] marks the topic.", "It is cold today."]
    assert not (tmp_path / "data" / "xx" / "learn" / "n5-1.json").read_text().count('"pt"')


def test_imported_translations_must_keep_their_placeholders():
    import pytest
    from mt_pieces import import_translations
    pieces = ["The particle [1] marks the topic.", "It is cold."]
    assert import_translations(pieces, ["0|A partícula [1] marca o tópico.", "1|Está frio."]) == {pieces[0]: "A partícula [1] marca o tópico.", pieces[1]: "Está frio."}
    with pytest.raises(ValueError):
        import_translations(pieces, ["0|A partícula marca o tópico."])


def test_the_german_course_tells_a_bold_english_gloss_from_a_german_form():
    import pytest
    if not (T.ROOT / "data" / "de" / "forms").exists():
        pytest.skip("German data not built")
    gloss = T.gloss_test("de")
    assert gloss("rich") and gloss("sadder and sadder") and gloss("attributive adjectives") and gloss("most beautiful")
    assert not gloss("reicher") and not gloss("der") and not gloss("immer trauriger") and not gloss("Es gibt")
    assert not gloss("was")          # a word of both languages stays protected
    assert T.gloss_test("ko") is None  # only courses whose bolds are known to mix glosses and forms


def test_a_page_names_who_translated_it(tmp_path, monkeypatch):
    # Grimm Grammar into Arabic: Claude's sentences (tools/mt_fixes) and EuroLLM's (its own cache) on one page
    body = "<p>The first sentence is here and it is long enough.</p><p>The second sentence is there and it is long too.</p>"
    f = page(tmp_path / "data", "de-x", source="Grimm Grammar (COERLL, UT Austin), CC BY 4.0", sections=[{"id": "lesson", "html": {"en": body}}])
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    (tmp_path / "tools" / "mt_fixes" / "ar").mkdir(parents=True)
    (tmp_path / "tools" / "mt_fixes" / "ar" / "grimm.yml").write_text("The first sentence is here and it is long enough.: الجملة الأولى\n", encoding="utf-8")
    (tmp_path / "vendor" / "mt").mkdir(parents=True)
    (tmp_path / "vendor" / "mt" / "cache.ar.eurollm.json").write_text(json.dumps({"The second sentence is there and it is long too.": "الجملة الثانية"}), encoding="utf-8")
    monkeypatch.setattr(T, "ROOT", tmp_path)
    T.translate_language("xx", T.CacheOnly("ar"))
    p = json.loads(f.read_text())
    assert p["mt"] == {"ar": "Claude + EuroLLM-9B"}
    assert "الجملة الأولى" in p["sections"][0]["html"]["ar"] and "الجملة الثانية" in p["sections"][0]["html"]["ar"]


def test_the_llm_prompt_names_the_languages_and_keeps_the_placeholders():
    prompt = T.llm_prompt("es", "ar", "de", "Todos terminan en [1], y la mayoría en [2].")
    assert "Spanish" in prompt and "Arabic" in prompt and "German" in prompt
    assert prompt.rstrip().endswith("Arabic:") and "Todos terminan en [1], y la mayoría en [2]." in prompt


def test_the_german_course_tells_a_line_of_german_forms():
    import pytest
    if not (T.ROOT / "data" / "de" / "forms").exists():
        pytest.skip("German data not built")
    taught = T.gloss_test("de").taught
    assert taught("backen (bäckt), backte, gebacken") and taught("der erste Januar")
    assert not taught("cool") and not taught("blue") and not taught("the first one")
    assert not taught("ran") and not taught("exceptions") and taught("Wie heißt du")   # English words that are also German forms


def test_a_page_explaining_the_language_in_itself_is_not_machine_translated(tmp_path, monkeypatch):
    # a German school grammar of German: explanation and examples are one language, a model cannot tell them apart
    d = tmp_path / "data" / "de" / "learn"
    d.mkdir(parents=True)
    (d / "de-bohm.json").write_text(json.dumps({"source": "Hermann Bohm, Kleine deutsche Sprachlehre", "sections": [{"id": "s",
        "html": {"en": "<p>Das Hauptwort ist der Name eines Dinges, und es wird mit dem Artikel der, die oder das verbunden.</p>"}}]}))
    (tmp_path / "data" / "de" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    monkeypatch.setattr(T, "gloss_test", lambda code: None)
    tr = Fake("mk")
    assert T.translate_language("de", tr) == 0 and tr.sent == []


def test_a_japanese_school_book_in_japanese_is_still_translated(tmp_path, monkeypatch):
    # unlike Bohm's German, a Japanese school book quotes its examples in 「」 (kept) and its classical texts are
    # protected; the same-language rule had frozen these pages at an older translation (Allan's ja>pt plan)
    d = tmp_path / "data" / "ja" / "learn"
    d.mkdir(parents=True)
    (d / "ja-wb-1.json").write_text(json.dumps({"source": "Wikibooks (ja), 高等学校古文/徒然草 (CC BY-SA 4.0)", "sections": [{"id": "s",
        "html": {"en": "<p>この段では、作者は「花は盛りに」と書いて、満開の花だけを見るべきではないと述べている。</p>"}}]}))
    (tmp_path / "data" / "ja" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    tr = Fake("pt")
    assert T.translate_language("ja", tr) == 1 and tr.sent and "「花は盛りに」" not in tr.sent[0]


def test_the_german_word_test_knows_the_language_a_book_explains_in():
    import pytest
    if not (T.ROOT / "data" / "es" / "forms").exists():
        pytest.skip("Spanish data not built")
    es = T.gloss_test("de", "es")
    assert es.taught("Ich bin so groß wie du") and not es.taught("Las partículas interrogativas")
    assert es("la mujer") and not es("die Frau")          # a bold Spanish gloss is explanation, a German form is not
    if (T.ROOT / "data" / "fr" / "forms").exists():
        fr = T.gloss_test("de", "fr")
        assert not fr.taught("au") and not fr.taught("du") and fr.taught("Ich bin der Mann")   # French function words


def test_a_stopped_run_keeps_what_it_translated(tmp_path, monkeypatch):
    # 2026-10-21: a four-hour EuroLLM run killed midway saved nothing since its last 960-sentence checkpoint
    page(tmp_path / "data", "de-x", sections=[{"id": "s", "html": {"en": "<p>A sentence that is long enough to send.</p>"}}])
    (tmp_path / "data" / "xx" / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)

    class Stopped(Fake):
        saved = 0

        def __call__(self, texts):
            raise KeyboardInterrupt

        def save(self):
            self.saved += 1
    tr = Stopped("mk")
    import pytest
    with pytest.raises(KeyboardInterrupt):
        T.translate_language("xx", tr)
    assert tr.saved == 1


def test_a_short_table_label_claude_translated_is_used_in_a_non_latin_course(tmp_path, monkeypatch):
    """tools/mt_fixes/<ui>/labels.yml: the short English cells of a course in another script ("Form", "Verb (negative)"),
    which are no prose and so stayed English (Allan's ja>pt check, 2026-10-21); in a Latin-script course ("Form" in German) a short cell may be a form"""
    (tmp_path / "tools" / "mt_fixes" / "pt").mkdir(parents=True)
    (tmp_path / "tools" / "mt_fixes" / "pt" / "labels.yml").write_text('"Form": "Forma"\n', encoding="utf-8")
    body = "<p>It attaches to a noun with no change at all.</p><table><tr><th>Form</th><th>Example</th></tr></table>"
    for code in ("ja", "xx"):
        d = tmp_path / "data" / code / "learn"
        d.mkdir(parents=True)
        (d / "n5-1.json").write_text(json.dumps({"id": "n5-1", "source": "JLPT Grammar Enhanced (CC BY-SA 4.0)", "sections": [{"id": "a", "html": {"en": body}}]}))
        (d.parent / "learn.json").write_text(json.dumps({"levels": []}))
    monkeypatch.setattr(T, "ROOT", tmp_path)
    cache = {"It attaches to a noun with no change at all.": "Liga-se a um substantivo sem mudança nenhuma."}
    T.translate_language("ja", T.CacheOnly("pt", dict(cache)))
    T.translate_language("xx", T.CacheOnly("pt", dict(cache)))
    ja = json.loads((tmp_path / "data" / "ja" / "learn" / "n5-1.json").read_text())["sections"][0]["html"]["pt"]
    xx = json.loads((tmp_path / "data" / "xx" / "learn" / "n5-1.json").read_text())["sections"][0]["html"]["pt"]
    assert "<th>Forma</th><th>Example</th>" in ja and "<th>Form</th>" in xx


def test_a_whole_run_in_the_cache_is_used_whole():
    """a label of two sentences ("Money? I haven't got a coin.") is translated whole in labels.yml, not by sentence"""
    tr = T.CacheOnly("pt", {"Money? I haven't got a coin.": "Dinheiro? Não tenho nem um tostão."})
    assert tr(["Money? I haven't got a coin."]) == ["Dinheiro? Não tenho nem um tostão."]


def test_a_classical_sentence_inside_a_modern_run_keeps_its_words():
    """a gloss run "・らうあり - 物慣れている。 例文 玉縁はいとらうありて…（大鏡）": the explanation is translated, the
    classical example sentence in it is not (Allan's ja>pt check, 2026-10-21)"""
    tr = T.CacheOnly("pt", {"・らうあり - 物慣れている。": "・らうあり – experiente."})
    tr.src = "ja"
    text = "・らうあり - 物慣れている。 例文 玉縁はいとらうありて、歌などいとよく詠み、（大鏡）"
    assert tr([text]) == ["・らうあり – experiente. 例文 玉縁はいとらうありて、歌などいとよく詠み、（大鏡）"]
    assert T.classical("（例文）見捨てたてまつりてまかる空よりも落ちぬべき心地する」と書き置く。")


def test_a_sentence_that_begins_with_a_protected_term_begins_with_a_capital():
    tr = T.Translator.__new__(T.Translator)
    tr.ui, tr.src, tr.cache, tr.new = "pt", "ja", {}, 0
    tr.save = lambda: None
    tr._model = lambda texts, *a: [t.replace("は", " é ").replace("。", ".") for t in texts]
    assert tr(["助動詞は大事。"]) == ["Verbo auxiliar é 大事."]
