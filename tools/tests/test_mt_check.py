"""automatic checks of a machine-translated Learn section, before a person (or Claude) reads a sample (Allan, 2026-10-20)"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mt_check import problems  # noqa: E402

ORIG = "<p>Le présent de <b>λύω</b> se forme avec les terminaisons <i>-ω, -εις</i> du présent actif.</p>"


def test_a_good_translation_has_no_problems():
    assert problems(ORIG, "<p>O presente de <b>λύω</b> forma-se com as terminações <i>-ω, -εις</i> do presente ativo.</p>", "fr") == []


def test_a_lost_example_is_flagged():
    assert "example lost: <b>λύω</b>" in problems(ORIG, "<p>O presente forma-se com as terminações <i>-ω, -εις</i> do presente ativo.</p>", "fr")


def test_a_run_left_in_the_original_language_is_flagged():
    assert any(p.startswith("untranslated") for p in problems(ORIG, ORIG, "fr"))


def test_a_repetition_loop_and_a_too_short_text_are_flagged():
    loop = "<p>O presente de <b>λύω</b> <i>-ω, -εις</i> " + "do presente ativo " * 12 + "</p>"
    assert any(p.startswith("repetition") for p in problems(ORIG, loop, "fr"))
    assert any(p.startswith("length") for p in problems(ORIG, "<p><b>λύω</b> <i>-ω, -εις</i> ok.</p>", "fr"))


def test_repetition_the_original_has_too_is_not_flagged():
    row = "<tr><td>Letter (jamo)</td><td>sound</td></tr>"
    orig = "<table>" + row * 8 + "</table>"
    out = "<table>" + row.replace("sound", "som") * 8 + "</table>"
    assert not any(p.startswith("repetition") for p in problems(orig, out, "en"))


def test_a_changed_word_in_another_script_is_flagged():
    orig = "<p>Try to read the words that contain the letter ㅗ and then read them again aloud.</p>"
    out = "<p>Tente ler as palavras que contêm a letra ㅜ e depois leia-as de novo em voz alta.</p>"
    assert "script text changed: ㅗ" in problems(orig, out, "en")


def test_a_translated_link_is_not_a_lost_example():
    orig = '<p>La langue est parlée en <a href="/w/Corée">Corée du Sud</a> et ailleurs dans le monde entier.</p>'
    out = '<p>A língua é falada na <a href="/w/Corée">Coreia do Sul</a> e em outros lugares do mundo inteiro.</p>'
    assert problems(orig, out, "fr") == []


def test_an_example_without_its_meaning_is_flagged():
    """Allan, 2026-10-20: Korean examples showed no meaning at all"""
    orig = '<p>Uma partícula que marca o sujeito de uma frase.</p><div class="ex"><p class="ja">오늘 밤은 달이 참 밝다.</p></div>'
    assert "example without meaning: 오늘 밤은 달이 참 밝다." in problems(orig, orig.replace("Uma", "Una"), "pt")


def test_an_example_with_its_meaning_line_is_fine_and_dense_text_may_double():
    ex = '<div class="ex"><p class="ja">今日は寒い。</p><p class="en">Está frio hoje.</p></div>'
    assert not any(p.startswith("example without") for p in problems(ex, ex, "en"))
    ja = "<p>結論が冒頭と最後の両方に書かれる文章構成を双括式と言います。</p>"
    pt = "<p>A estrutura de texto em que a conclusão aparece tanto no começo quanto no fim chama-se estrutura de dupla conclusão.</p>"
    assert not any(p.startswith("length") for p in problems(ja, pt, "ja"))


def test_a_page_already_in_the_interface_language_is_not_untranslated():
    from mt_check import problems
    en = '<p>A postpositional particle referring to the subject of a sentence here.</p>'
    assert problems(en, en, "en", ui="en") == []


def test_a_translated_bold_gloss_is_not_a_lost_example():
    orig = "<p>Once upon a time, there was a <b>rich</b> man, said <b>reicher</b>.</p>"
    out = "<p>Си бил еднаш еден <b>богат</b> човек, рече <b>reicher</b>.</p>"
    assert problems(orig, out, "en", "mk", gloss=lambda t: t == "rich") == []
    assert problems(orig, out, "en", "mk") == ["example lost: <b>rich</b>"]


def test_ipa_beside_cyrillic_output_is_not_a_changed_script():
    # a French vocabulary page into Macedonian: the IPA is kept, the Cyrillic around it is the translation
    orig = "<p>le monsieur, prononcé ˈhɛʁ en allemand</p>"
    out = "<p>господинот, се изговара ˈhɛʁ на германски</p>"
    assert not [p for p in problems(orig, out, "fr", "mk") if p.startswith("script")]
