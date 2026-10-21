"""Machine translation of Learn pages keeps the HTML and every word of the taught language as it is: only English
prose goes to the model, with the bold/italic forms in it replaced by placeholders and put back afterwards."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from mt_html import classical, is_english, is_prose, segments, translate_html  # noqa: E402


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


def test_ipa_in_brackets_or_slashes_is_protected():
    from mt_html import segments
    run = [s for s in segments("<p>The word is pronounced [mak̚t͈ɯ] or /ˈmakto/ in normal speech here.</p>", src="en") if "text" in s][0]
    assert "[mak̚t͈ɯ]" in run["inline"] and "/ˈmakto/" in run["inline"] and "mak" not in run["text"]


def test_ipa_with_an_example_inside_is_kept_whole():
    from mt_html import translate_html
    page = "<p>The word <b>막</b> is said [mak̚<b>ㄱ</b>i] when a consonant follows it here.</p>"
    out = translate_html(page, lambda texts: [t.replace("The word", "A palavra").replace("\u031a", "\u031c") for t in texts], "en")
    assert "[mak̚<b>ㄱ</b>i]" in out


def test_quoted_japanese_in_a_japanese_explanation_is_protected():
    """school books explain Japanese in Japanese: the examples are in 「」 or 『』"""
    from mt_html import segments
    run = [s for s in segments("<p>「いとをかし」は「とても趣がある」という意味で、古文によく出てくる言葉です。</p>", src="ja") if "text" in s][0]
    assert run["translate"] and "「いとをかし」" in run["inline"] and "いとをかし" not in run["text"]


def test_link_text_is_prose_and_gets_translated():
    """« parlée en Corée du Sud » with the place as a link: the link text is translated, the link kept"""
    from mt_html import translate_html
    out = translate_html('<p>Elle est parlée en <a href="/wiki/Corée_du_Sud">Corée du Sud</a> et ailleurs dans le monde.</p>',
                         lambda texts: [t.replace("Corée du Sud", "Coreia do Sul").replace("Elle est parlée en", "É falada na") for t in texts], "fr")
    assert out == '<p>É falada na <a href="/wiki/Corée_du_Sud">Coreia do Sul</a> et ailleurs dans le monde.</p>'


def test_an_element_marked_with_a_language_stays_protected():
    from mt_html import segments
    run = [s for s in segments('<p>Le mot <span lang="ko">한국</span> veut dire la Corée dans la langue.</p>', src="fr") if "text" in s][0]
    assert '<span lang="ko">한국</span>' in run["inline"]


def test_short_lines_and_dialogue_in_the_explanation_language_are_prose():
    from mt_html import is_prose
    assert is_prose("Les consonnes", "fr") and is_prose("Par exemple :", "fr") and is_prose("avec contraction :", "fr")
    assert is_prose("John: Je suis John. Je suis professeur. Quel est ton nom?", "fr")
    assert not is_prose("puella", "en") and not is_prose("Corée", "fr")


def test_a_run_that_is_mostly_examples_is_not_sent_to_the_model():
    """kanbun with a ruby on every character is dozens of placeholders: text being studied, and it crashed the GPU"""
    from mt_html import crowded
    real = "[1]呂[2][3][4][5]翁[6][7][8][9]坐[10][77][11][12][13][14][15]其[16][17][18][19]傍[20][78][21][22]、[23][24][25]主[28][29]"
    assert crowded(real)
    assert not crowded("The particle [1] marks the topic, and [2] marks the subject of a sentence like [3] or [4].")


def test_a_bold_english_gloss_is_translated_inside_its_sentence():
    # Grimm Grammar bolds the English gloss of the German example ("there was a <b>rich</b> man"): with a gloss
    # test for the course, the bold's tags become placeholders and its word is translated with the sentence
    html = "<p>Once upon a time, there was a <b>rich</b> man, said <b>reicher</b>.</p>"
    seg = [s for s in segments(html, "en", gloss=lambda t: t == "rich") if "text" in s][0]
    assert seg["text"] == "Once upon a time, there was a [1]rich[2] man, said [3]."
    assert seg["inline"] == ["<b>", "</b>", "<b>reicher</b>"]
    out = translate_html(html, lambda xs: ["Си бил еднаш еден [1]богат[2] човек, рече [3]."], "en", gloss=lambda t: t == "rich")
    assert out == "<p>Си бил еднаш еден <b>богат</b> човек, рече <b>reicher</b>.</p>"
    # without a gloss test a bold stays a protected example, as before
    assert [s for s in segments(html, "en") if "text" in s][0]["text"] == "Once upon a time, there was a [1] man, said [2]."


def test_an_ipa_span_is_protected_like_an_example():
    # Wikibooks German puts IPA in <span class="IPA">: a span is otherwise transparent prose
    run = [s for s in segments('<p>The word hallo is said <span class="IPA" title="IPA">/ˈhaloː/</span> in German.</p>') if "text" in s][0]
    assert run["text"] == "The word hallo is said [1] in German."
    assert run["inline"] == ['<span class="IPA" title="IPA">/ˈhaloː/</span>']


def test_an_ipa_word_without_brackets_is_protected_whole():
    # Wikiversity's French vocabulary pages give IPA bare in a cell; MADLAD turned "ˈʃtaːk" into "ˈʃтаː…"
    from mt_html import protect_script
    inline = []
    out = protect_script("le mot se prononce ˈʃtʊndə et aussi ˈmaɪ̯nə ici", "fr", inline)
    assert out == "le mot se prononce [1] et aussi [2] ici" and inline == ["ˈʃtʊndə", "ˈmaɪ̯nə"]


def test_a_form_list_with_a_gloss_in_brackets_keeps_the_forms():
    # Wikiversity's list of German verbs: "backen (bäckt), backte, gebacken (to bake)": only "(to bake)" is English
    html = "<p>backen (bäckt), backte, gebacken (to bake)<br>beginnen, begann, begonnen (to begin)</p>"
    german = lambda t: not any(w in t for w in ("backen", "beginnen"))     # the course's gloss test: True = English
    runs = [s for s in segments(html, "en", gloss=german) if "text" in s]
    assert runs[0]["text"] == "[1](to bake)" and runs[0]["inline"] == ["backen (bäckt), backte, gebacken "] and runs[0]["translate"]
    out = translate_html(html, lambda xs: [x.replace("to bake", "печe").replace("to begin", "почнува") for x in xs], "en", gloss=german)
    assert out == "<p>backen (bäckt), backte, gebacken (печe)<br>beginnen, begann, begonnen (почнува)</p>"
    # an English headword with its gloss ("blue (also: drunk)") is translated whole; without a gloss test, as before
    assert [s for s in segments("<p>blue (also: drunk)</p>", "en", gloss=german) if "text" in s][0]["text"] == "blue (also: drunk)"
    assert [s for s in segments(html, "en") if "text" in s][0]["text"] == "backen (bäckt), backte, gebacken (to bake)"


def test_quoted_german_in_a_french_explanation_is_protected():
    german = lambda t: "Mann" not in t           # gloss test: True = English; "Mann" lines are German
    german.taught = lambda t: "Mann" in t
    run = [s for s in segments("<p>On dira donc « Ich bin der Mann » (der = nominatif), jamais « Ich bin den Mann ».</p>", "fr", gloss=german) if "text" in s][0]
    assert "Ich bin der Mann" not in run["text"] and "« Ich bin der Mann »" in run["inline"]


def test_german_words_in_plain_text_are_protected_in_the_german_course():
    # English Wikibooks German writes its examples unmarked: "Dialogue: What's your name? — Wie heißt du?"
    gl = lambda t: False
    gl.taught = lambda t: all(w in {"wie", "heißt", "du", "danke", "sehr", "sein", "werden"} for w in t.lower().replace("ß", "ß").split())
    inline = []
    from mt_html import protect_script
    out = protect_script("Dialogue: What's your name? — Wie heißt du? Say Danke (sehr)! with verbs like sein or werden.", "en", inline, gl)
    assert out == "Dialogue: What's your name? — [1]? Say [2] ([3])! with verbs like [4] or [5]."
    assert inline == ["Wie heißt du", "Danke", "sehr", "sein", "werden"]
    gl.taught = lambda t: t == "aren"          # a piece of an English contraction is never a German word
    assert protect_script("These mushrooms aren't edible.", "en", [], gl) == "These mushrooms aren't edible."


def test_a_german_sentence_is_not_made_english_by_protecting_its_german_words():
    gl = lambda t: False
    gl.taught = lambda t: t.lower() in {"sie", "sah", "ihren", "blutigen", "finger"}
    run = [s for s in segments("<p>Sie sah ihren blutigen Finger an und es war so.</p>", "en", gloss=gl) if "text" in s][0]
    assert not run["translate"]


def test_a_short_english_cell_with_a_known_label_is_translated():
    # JLPT Grammar Enhanced's tables: "Form", "Example", "Verb (negative)" are under three words, so they stayed
    # English in every UI (Allan's ja>pt check, 2026-10-21); a label Claude translated is used, other short runs stay
    html = "<table><tr><th>Form</th><th>Example</th></tr><tr><td>Verb (negative)</td><td>食べない</td></tr></table>"
    assert not [s for s in segments(html, "en") if s.get("translate")]
    known = {"Form": "Forma", "Verb (negative)": "Verbo (negativo)"}
    runs = [s["text"] for s in segments(html, "en", label=known.__contains__) if s.get("translate")]
    assert runs == ["Form", "Verb (negative)"]
    out = translate_html(html, lambda xs: [known[x] for x in xs], "en", label=known.__contains__)
    assert out == "<table><tr><th>Forma</th><th>Example</th></tr><tr><td>Verbo (negativo)</td><td>食べない</td></tr></table>"


def test_classical_japanese_and_kanbun_lines_are_the_studied_text():
    # Wikibooks (ja) school books: MADLAD turned Tsurezuregusa's own words into Portuguese ("…a lua está apenas na
    # forma de um kumma", Allan's ja>pt check, 2026-10-21); the classical text stays, its modern rendering is translated
    kobun = "花は盛りに、月は隈（くま）なきをのみ見るものかは。雨に向かひて月を恋ひ、垂れ込めて春の行方知らぬも、なほあはれに情け深し。"
    kanbun = "項王軍壁垓下。兵少食尽。漢軍及諸侯兵囲之数重。"
    modern = "（はたして、）桜の花は咲いているときだけを見るべきだろうか、月は曇りないときだけを見るべきなのだろうか。"
    gloss = "・見るものかは - 見るものだろうか。（いや、そうではない。）反語表現になっている。「かは」は反語を表す係助詞。"
    assert not is_prose(kobun, "ja") and not is_prose(kanbun, "ja")
    assert is_prose(modern, "ja") and is_prose(gloss, "ja")
    # modern words that end like classical auxiliaries (避ける, 無ければ) and an all-kanji heading are not classical
    assert is_prose("世の中に避けることの出来ない別れが無ければ、親に先年と生きてほしいと思う、子供のために。", "ja")
    # one strong sign is enough (べし, 哉 in a kakikudashi line), and a book's 例文 line is its classical example
    assert classical("→応に故郷の事を知るべし。") and classical("豈に千里を遠しとせん哉。")
    assert classical("例文 菰積みたる舟のありくこそ、いみじうおかしかりしか。（枕）")
    assert is_prose("・あさましき身 - 落ちぶれた身。現代語の「あさましい」とは意味が違う。", "ja")
    assert not classical("本文/現代語訳") and classical("夕日のかかやいたるに、白波の上に漂ひ、浮きぬ沈みぬ揺られければ、沖には平家、船端をたたいて感じたり、")


def test_a_classical_line_with_bold_key_words_is_still_the_studied_text():
    # the school book bolds the words it glosses below (見るものかは, 恋ひ): as placeholders they hid the classical signs
    html = "<p>花は盛りに、月は隈（くま）なきをのみ<b>見るものかは</b>。<b>雨に向かひて月を恋ひ</b>、<b>垂れ込めて春の行方知らぬ</b>も、<b>なほ</b>あはれに情け深し。</p>"
    assert not [s for s in segments(html, "ja") if s.get("translate")]


def test_japanese_school_grammar_terms_are_kept_from_the_model():
    # MADLAD (through English) made 体言 "linguagem corporal", 終止形 "formulário de rescisão", 係り結び "nó
    # associativo" (Allan's ja>pt check, 2026-10-21): each term is a placeholder, filled from the glossary
    from mt_html import protect_terms
    text, terms = protect_terms("助動詞[1]は連体形に接続し、尊敬語を作る。", "pt", "ja")
    assert text == "[2][1]は[3]に接続し、[4]を作る。" and terms == ["verbo auxiliar", "forma rentai (atributiva)", "linguagem honorífica (sonkeigo)"]
    assert protect_terms("体言とは", "pt", "en") == ("体言とは", [])


def test_names_in_japanese_school_books_come_from_the_glossary():
    # 項羽 came out "Genjiwa", 清少納言 "Kiyoshonagagon", 孟子 "Momoko" (Allan's ja>pt check, 2026-10-21)
    from mt_html import protect_terms
    text, terms = protect_terms("清少納言と紫式部、そして項羽と沛公。", "pt", "ja")
    assert text == "[1]と[2]、そして[3]と[4]。" and terms == ["Sei Shōnagon", "Murasaki Shikibu", "Xiang Yu", "o duque de Pei (Liu Bang)"]


def test_kanji_reading_lists_and_poem_readings_are_kept():
    # "楽：（がく・ラク）…" came out "Cancro: (gaku-rak)…", a waka's kana reading as romanised nonsense
    assert classical("楽　：（がく・ラク）（たの-しい・たの-しむ）") and classical("務（ム）・義務（ぎむ）・事務（じむ）。")
    assert classical("（おくやまに　もみじふみわけ　なくしかの　こえきくときぞ　あきワかなしき）")
    assert not classical("実際には道兼（みちかね）は出家をしなかった。")


def test_an_english_note_after_a_ruby_heavy_example_is_still_translated():
    # JLPT's mistake lines: "❌ <ruby>…</ruby>… → ✅ …  A single past event only. Habits take と or たびに." had more
    # than twelve rubies, so the run counted as crowded kanbun and its English note stayed English
    rb = "".join(f"<ruby>雨<rt>あめ</rt></ruby>が" for _ in range(14))
    html = f"<p>❌ {rb}ってしまう。 → ✅ {rb}ると。 A single past event only. Habits take と or たびに.</p>"
    assert [s for s in segments(html, "en") if s.get("translate")]
    chart = "".join(f"[ <b>{k}</b> ] " for k in ("a", "ka", "sa", "ta", "na", "ha", "ma", "ya", "ra")) + "[ <b>wa, wo, n</b> ]"
    assert not [s for s in segments(f"<p>{chart}</p>", "en") if s.get("translate")]      # a romaji kana chart
    kanbun = "".join(f"<ruby>{c}<rt>x</rt></ruby>" for c in "項王軍壁垓下兵少食尽漢軍及諸侯")
    assert not [s for s in segments(f"<p>{kanbun}</p>", "ja") if s.get("translate")]
