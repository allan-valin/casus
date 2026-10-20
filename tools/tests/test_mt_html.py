"""Machine translation of Learn pages keeps the HTML and every word of the taught language as it is: only English
prose goes to the model, with the bold/italic forms in it replaced by placeholders and put back afterwards."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mt_html import is_english, segments, translate_html  # noqa: E402


def test_english_prose_is_told_from_forms():
    assert is_english("Masculine nouns take the article der in the nominative.")
    assert not is_english("der Mann, die Frau")
    assert not is_english("читаю, читаєш, читає")
    assert not is_english("3")


def test_inline_forms_become_placeholders_and_come_back():
    html = "<p>The verb <b>sein</b> is irregular: <b>ich bin</b>, <i>du bist</i>.</p>"
    segs = segments(html)
    texts = [s for s in segs if s.get("translate")]
    assert len(texts) == 1
    assert "sein" not in texts[0]["text"] and "[1]" in texts[0]["text"] and "[2]" in texts[0]["text"]
    fake = lambda xs: [x.replace("The verb", "Das Verb").replace("is irregular", "ist unregelmäßig") for x in xs]   # noqa: E731
    out = translate_html(html, fake)
    assert out == "<p>Das Verb <b>sein</b> ist unregelmäßig: <b>ich bin</b>, <i>du bist</i>.</p>"


def test_a_table_of_forms_is_left_alone_but_its_english_header_is_translated():
    html = "<table><thead><tr><th>Person</th><th>singular</th></tr></thead><tbody><tr><td>1st</td><td>bin</td></tr></tbody></table>"
    seen = []
    out = translate_html(html, lambda xs: seen.extend(xs) or [x.upper() for x in xs])
    assert "bin" not in seen and "<td>bin</td>" in out


def test_a_placeholder_the_model_drops_falls_back_to_the_english():
    html = "<p>Use <b>der</b> before masculine nouns in the nominative case.</p>"
    out = translate_html(html, lambda xs: ["Verwende vor maskulinen Nomen im Nominativ." for _ in xs])
    assert out == html


def test_grammar_terms_are_protected_and_given_their_term():
    from mt_html import protect_terms
    text, terms = protect_terms("Neuters do not change; masculine nouns drop -ur in the accusative.", "de")
    assert "Neuters" not in text and "accusative" not in text and "masculine" in text
    assert any(t == "Neutra" for t in terms) and "Akkusativ" in terms


def test_a_repeated_translation_is_cut_to_once():
    from mt_html import dedupe
    assert dedupe("Beispiele Beispiele:", "Examples") == "Beispiele"
    assert dedupe("Das Verb ist unregelmäßig. Das Verb ist unregelmäßig.", "The verb is irregular.") == "Das Verb ist unregelmäßig."
    assert dedupe("Der Akkusativ: direktes Objekt.", "the accusative: direct object") == "Der Akkusativ: direktes Objekt"
