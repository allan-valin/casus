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


def test_prose_in_any_explanation_language():
    """imported books explain in French, German, Spanish…, Japanese (Allan, 2026-10-20: translate every imported book)"""
    from mt_html import is_prose
    assert is_prose("Le verbe se conjugue avec les terminaisons du présent et on ajoute un s.", "fr")
    assert not is_prose("The verb takes the endings of the present tense.", "fr")
    assert is_prose("Das Verb steht im Nebensatz immer am Ende des Satzes.", "de")
    assert is_prose("El verbo se conjuga con las terminaciones del presente.", "es")
    assert is_prose("動詞は文の最後に置かれることが多いです。", "ja")
    assert not is_prose("λύω λύεις λύει", "fr")
    assert is_prose("The verb takes the endings of the present tense.", "en")
    assert is_prose("O verbo concorda com o sujeito em número e pessoa.", "pt")
    assert is_prose("Il verbo si coniuga con le desinenze del presente.", "it")
    assert is_prose("Het werkwoord staat in de bijzin aan het eind.", "nl")


def test_segments_translate_only_the_explanation_language():
    from mt_html import segments
    segs = segments("<p>Le présent de <b>λύω</b> se forme ainsi.</p><p>λύω, λύεις, λύει, λύομεν</p>", src="fr")
    runs = [s for s in segs if "text" in s]
    assert runs[0]["translate"] and runs[0]["inline"] == ["<b>λύω</b>"]
    assert not runs[1]["translate"]


def test_text_in_another_script_is_protected_like_an_example():
    """a Korean letter in plain English text must come back exactly (the model turned ㅗ into ㅜ)"""
    from mt_html import segments
    run = [s for s in segments("<p>Read the words with the letter ㅗ (o) and 오이.</p>", src="en") if "text" in s][0]
    assert run["translate"] and "ㅗ" not in run["text"] and "오이" not in run["text"]
    assert "ㅗ" in run["inline"] and "오이" in run["inline"]


def test_a_sentence_said_twice_without_a_space_is_cut_to_once():
    from mt_html import dedupe
    assert dedupe("É o [3], por isso o [4] soa.É o [3], por isso o [4] soa.", "It is [3], so [4] sounds.") == "É o [3], por isso o [4] soa."


def test_entities_are_plain_characters_for_the_model_and_escaped_again():
    from mt_html import translate_html
    sent = []

    def model(texts):
        sent.extend(texts)
        return [t.replace("means", "significa") for t in texts]
    out = translate_html("<p>The ending means &quot;as&quot; &amp; more&#160;here and there.</p>", model, "en")
    assert sent == ['The ending means "as" & more here and there.']
    assert out == "<p>The ending significa &quot;as&quot; &amp; more here and there.</p>"
