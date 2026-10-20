# Open teaching material found by searching in the languages themselves (2026-10-20)

Follow-up to `LEARN-SOURCES-RESEARCH-2026-10-20.md`. Allan asked whether the search was done only in English. This pass
searched in the target languages and in German, French, Spanish, Portuguese, Italian, Russian, Polish, Japanese, Korean,
Chinese and Arabic. Search terms included the localised CC licence names ("Uznanie autorstwa – Na tych samych
warunkach", "Uveďte původ – Zachovejte licenci", "Nevezd meg! – Így add tovább!", "Nimeä-JaaSamoin", "공공누리 제1유형",
"表示-継承", "Atribuição-CompartilhaIgual", etc.). I also queried repositories that filter by licence: OERSI (German OER
index), aoe.fi (Finnish national OER library, API `POST https://aoe.fi/api/v2/search`), Zenodo, the Internet Archive,
the Wikibooks/Wikiversity APIs of 20 language editions, and GitHub.

Priority (from Allan via the coordinator): material in which a language teaches **itself** to foreigners, written in
that language or bilingual. Accepted licences: PD, CC0, CC BY, CC BY-SA, GFDL, GPL. "Free to download" is not enough.

How sure the licence is: **[page]** = I read the licence on the source page or in the file. **[meta]** = taken from
repository metadata (OERSI/aoe.fi), page not opened (Pressbooks blocks scripts). **[law]** = not covered by copyright
by statute (official/normative text). **[?]** = unverified or contradictory.

## Top 10 worth importing

1. **Polish, official graded grammar list A1–C2** (annex 1 to the exam regulation, Dz.U. 2025 poz. 217). Ten lists of
   grammar points, each with examples, for adults A1–C2 and for young learners A1–B2, plus topic and function
   catalogues. It is a normative act, so it is outside copyright under art. 4 of the Polish Copyright Act **[law]**.
   This is the open graded grammar inventory that the first pass said did not exist for Slavic languages. HIGH.
2. **Finnish S2 material on aoe.fi, written in Finnish**: "Suomen kielen harjoituksia tasoille A1–A2" (CC BY-SA 4.0),
   "Suomen kielen itseopiskelumateriaali" (a self-study beginner PDF, CC BY-SA 4.0), "S2 alkeistason lisäharjoituksia"
   (46 H5P exercises, CC BY-SA 4.0), easy-Finnish (selkokieli) S2 courses (CC BY-SA 4.0) and "Paranna suomen kieltäsi"
   (CC BY 4.0) **[meta+page]**. The API makes the material scriptable. HIGH.
3. **Hungarian, German Wikibooks "Ungarisch"**: 1,506 pages. A 92-page grammar plus a large thematic graded reader
   (Lesebuch: everyday topics, dialogues, short stories, fairy tales, frequent words; Hungarian with German), about
   130 MB of wikitext, CC BY-SA **[page]**. It is the largest open Hungarian course found in any language. HIGH.
4. **Korean, NIKL's own teaching materials** on 한국어교수학습샘터 (kcenter.korean.go.kr): textbook and teacher's-guide
   PDFs and class PPTs, released under 공공누리 제1유형 (attribution only, commercial use and derivatives allowed).
   Books still in print are only type 4 (avoid those) **[page]**. Caveat: NIKL says KOGL applies only where Korean law
   applies, and foreign users or institutions must ask permission. This also affects the NIKL grammar list in the first
   doc. HIGH content, licence caveat.
5. **Czech, "Česky systematicky" (Mozaika)**: 11 lessons for beginners (7 lesson PDFs online), with dialogues, grammar,
   exercises and a key; Czech with English. Every page carries "Creative Commons Uveďte autora – Zachovejte licenci 3.0
   Unported" (CC BY-SA 3.0) **[page]**. HIGH.
6. **French, two open FLE grammars written in French**: "Grammaire française : approche interactive et visuelle"
   (U. Waterloo, B1–B2, H5P exercises, CC BY-SA 4.0 **[meta]**) and "Grammaire Ouverte" (James Law, 28 chapters, PDF and
   online, CC BY 4.0 **[page]**). HIGH.
7. **Japanese, MEXT 「生活者としての外国人」に対する日本語教育の標準的なカリキュラム案 教材例集**: 281 pages, 46 .docx
   lesson units across 11 life domains, plus can-do Excel files. These are MEXT content under MEXT's use rules, which
   say they are compatible with CC BY 4.0 **[page]**. Logos and third-party items are excluded. MEDIUM-HIGH.
8. **Graded readers, Global Storybooks (global-asp on GitHub)**: about 40 levelled children's stories per language in
   Markdown, under "Creative Commons Attribution 4.0" **[page]**. Counts: pl 42, hu 41, tr 42, el 40, ja 45, ko 43,
   ru 30, plus de, ar, zh, es, it, uk, nl, and pt/fr in global-pb. MEDIUM, but cheap to import.
9. **Portuguese Wikibooks, two books in Portuguese** (CC BY-SA **[page]**). *Inglês* (120 pages, 278 KB) is an English
   grammar for Brazilians, written in Portuguese and organised by grammar point: comparatives, still/yet/already,
   question tags, plus 10 basic and 2 intermediate lessons. It can serve as the point list for English (for
   Brazilians). *Português para estrangeiros* (17 pages) teaches Portuguese in Portuguese: indicative, subjunctive,
   pronouns, numerals, linking verbs, with exercises. MEDIUM-HIGH for English, MEDIUM for Portuguese.
10. **Ancient Greek I and II: A 21st-Century Approach** (Philip S. Peek, Open Book Publishers 2021 and 2025), CC BY 4.0
    (Crossref licence field) **[meta]**, doi 10.11647/OBP.0264 and OBP.0441. A complete modern course, missing from the
    first doc. It is written in English, so it falls outside the "teaches itself" priority, but it is the strongest new
    Greek find. HIGH for Greek.

Also checked and weaker than they looked: French Wikibooks *Grec ancien* (205 pages, but 576 KB of that is one lexicon
page and 89 pages are about gods), Spanish *Japonés* (339 pages, mostly single-kanji pages), and Italian *Italiano L2*
(10 pages) and *Italiano per migranti A2* (1 page).

Corrections to the first doc: the NIKL KOGL type 1 grant is limited to use under Korean law (see Korean). The VISK
(Iso suomen kielioppi) licence is still unverified: kaino.kotus.fi returns 403 to scripts, and the Kotus open-data
page no longer lists it.

---

## Polish

- **HIGH: Standardy wymagań … polskiego jako obcego**, annex 1 to *Rozporządzenie Ministra Nauki i Szkolnictwa Wyższego
  z dnia 14 lutego 2025 r. w sprawie egzaminów z języka polskiego jako obcego* (Dz.U. 2025 poz. 217).
  PDF: https://eli.gov.pl/eli/DU/2025/217/ogl/pol/pdf (137 pages, text layer, clean pdftotext).
  - Written in Polish. Ten "Lista zagadnień gramatycznych" sections (adults A1, A2, B1, B2, C1, C2 and young learners
    A1–B2). Each is split into fleksja (declension by gender and ending class, adjectives, pronouns, numerals;
    conjugation by tense, aspect, mood) and składnia (case functions with example sentences). About 770 "np.:" example
    groups. Katalog A (functions) and Katalog B (topics) for each level.
  - Licence: a normative act, so not covered by copyright (Polish Copyright Act art. 4 pkt 1: "Nie stanowią przedmiotu
    prawa autorskiego: akty normatywne lub ich urzędowe projekty") **[law]**. The older versions (Dz.U. 2016 poz. 405
    and the 2018 consolidated text poz. 1386) are the same kind of text.
  - No exercises. It is a point list with examples, which is what the Learn tab's point list needs.
- **MEDIUM: Ramy programowe polonijnej edukacji językowo-kulturowej**, parts I–II (IRJP, gov.pl). 102 + 178 pages,
  Polish, CEFR-organised curriculum for heritage learners abroad.
  https://www.gov.pl/web/irjp/materialy-do-pobrania-ramy-programowe-polonijnej-edukacji-jezykowo-kulturowej
  Licence: gov.pl footer, "Treści tekstowe publikowane w serwisie (z wyłączeniem treści audiowizualnych), są
  udostępniane na licencji … CC BY-SA 4.0". Photos, audio and video are BY-NC-ND. The PDFs carry no notice of their
  own **[page/?]**.
- **MEDIUM [?]: Językowa podróż po Polsce** (Szostak-Król 2019, A1, ages 11–15; textbook 61 MB PDF plus a methodology
  guide on ZPE). gov.pl/UDSC hosts it with no colophon licence, so only the gov.pl footer (CC BY-SA 4.0 for text)
  applies. Usable only if that site-wide statement is accepted for attachments. Ask before importing.
  https://www.gov.pl/attachment/440d2b16-17e1-457c-a7a9-3f1b31ed1eb0
- LOW: **Wolne Lektury** (wolnelektury.pl): "Wszystkie utwory w bibliotece znajdują się w domenie publicznej bądź są
  udostępnione na jednej z wolnych licencji". Polish literature for reading (not graded). It has an API.
- LOW: Uniwersytet Śląski SJiKP, *Głoski polskie* (phonetics guide for foreigners), CC BY-SA 4.0 per search snippet **[?]**.
- AVOID: *Gramatyka dla praktyka* (BY-NC-ND); *Programy nauczania … A1–C2* (RUJ, BY-NC-ND); *Raz, dwa, trzy i po
  polsku mówisz ty!* (free after a form, no licence); *Polski bez granic* (©).
- Wikibooks: French *Polonais* 25 pages; Spanish *Polaco* 22; Portuguese *Polonês* 17; German *Polnisch* 54 (see table).

## Finnish

- **HIGH: aoe.fi (Avointen oppimateriaalien kirjasto)**, the national OER library. A query for "suomi toisena kielenä"
  gives 716 hits, and every item carries a licence field. Open (BY / BY-SA) items written in Finnish for learners:
  - 5851 *Suomen kielen harjoituksia tasoille A1–A2*, CC BY-SA 4.0, .docx, exercises in six sections (P. Vuollo).
  - 5819 *Suomen kielen itseopiskelumateriaali*, CC BY-SA 4.0, PDF, self-study beginner course for immigrants.
  - 4367 *S2 alkeistason lisäharjoituksia (Vierko)*, CC BY-SA 4.0, 46 H5P files (alphabet, numbers, reading).
  - 5839 / 4276 / 5205 *Suomi toisena kielenä … selkokielellä*, CC BY-SA 4.0, vocational S2 courses in easy Finnish.
  - 587, 1682 S2 Moodle courses (CC BY-SA 4.0); 1050 S2 elective course script (CC BY 4.0, PDF).
  - 2213 *Paranna suomen kieltäsi* (CC BY 4.0, itslearning package); 2521 home and housing exercises (CC BY 4.0, Padlet
    and Wordwall).
  - 440 *S2-abikurssin harjoitusmateriaaleja* (24 H5P, CC BY-SA 4.0, upper level); 690 *Lukeminen lentoon* (CC BY-SA).
  - Readers: 2960 *Lukisoppa* (easy-Finnish recipes, CC BY-SA), 140 *Matkalla Kalevalaan*, 579 *7 veljestä* (CC BY-SA).
  - AVOID the NC items, including 1995 *Milloin tulee partitiivi?* and 2103 *Kielikertaus* (BY-NC-SA), 6118 *Suomi
    opittavana kielenä* (BY-ND), and *Tähtijengi* (NC-ND).
  - Licences come from the API (`license.key`) and are shown on each item page (e.g. https://aoe.fi/materiaali/5851).
- LOW: Neuhaus, *Kleine finnische Sprachlehre* (1908, German; IA kleinefinnische00neuhgoog; author's death date
  unknown, so PD in the US only).
- MEDIUM: **Finnish Wikibooks *Suomen kieli*** (47 pages, 126 KB, CC BY-SA), aimed at learners: sounds, vowel length, stress, parts of speech, object case choice, imperative, an *astevaihtelu* page, and 20 graded reading texts ("Suomen kieli käyttöön": Koti Suomessa, Terveydenhuolto, Rajalla…), with contents pages in en/ru/fi.
- Still open: VISK licence (see the top section). The Opetushallitus kotoutumiskoulutus curriculum is "© Opetushallitus".

## Hungarian

- **HIGH: German Wikibooks "Ungarisch"** (https://de.wikibooks.org/wiki/Ungarisch), CC BY-SA 4.0 (Wikibooks footer).
  1,506 pages. *Ungarisch-Grammatik* has 92 pages: cases, conjugation, conditional, causative, imperative, and many
  "Beispielsätze" pages. The *Lesebuch* series has about 1,300 pages: everyday topics (266 pages), general reader (511),
  short stories (94), frequent words (91), dialogues (56), fairy tales (35), easy texts for children (70), proverbs,
  jokes, numbers practice, and themed vocabulary. Bilingual Hungarian/German. Wikitext via the API.
- LOW: Nagy, *Kleine ungarische Sprachlehre* (1897/1908, German, with reading and translation exercises; IA
  kleineungarisch00nagygoog). PD in the US; author's death date not checked.
- AVOID: *Magyarnyelv-tanítás gyermekeknek* (OAPEN, BY-NC-ND); MagyarOK (no licence); magyarora.com (no licence).

## Czech

- **HIGH: Česky systematicky (Mozaika)**, https://www.mozaika.eu/ucebnice-cestiny/. 11 lessons for beginners (A1);
  lessons 1–7 are online as PDFs (e.g. lesson 2 has 9 pages). Each has review, vocabulary, dialogue, grammar,
  exercises (matching, gap-fill, transformation), songs and riddles, and a bonus. A key exists. Czech with English
  glosses. Every PDF page says "Text je dostupný pod licencí Creative Commons Uveďte autora – Zachovejte licenci 3.0
  Unported, případně za dalších podmínek." **[page]**. Lessons 8–11 and some appendices are not online.
- LOW [?]: CICOPS/CIC downloads (Čeština do práce 210 pp, Nečtu, nepíšu, učím se česky 111 pp, worksheets). The site
  footer says "Creative Commons Uveďte původ 4.0", but the PDFs say "© Centrum pro integraci cizinců 2018". Treat as
  not open.
- AVOID: *Česky krok za krokem* (BY-NC); inkluzivniskola.cz (site BY-NC; linked books have no licence); Czech it UP,
  Levou zadní (©).
- Wikibooks: none useful (French *Tchèque* is a stub). Czech Wikibooks has no Czech-for-foreigners book.

## Russian

- No open RKI (русский как иностранный) textbook found. Searches covered Russian-language licence phrases ("С указанием
  авторства"), Zenodo (9.8k RFL hits, all articles), elar.urfu.ru and RUDN. Russian university manuals are © or behind
  library platforms (ЭБС).
- MEDIUM: **Diverse Russian: A Multicultural Exploration** (Wisconsin/MSU, Pressbooks), CC BY-SA 4.0 **[meta]**,
  https://wisc.pb.unizin.org/diverserussian/. Intermediate cultural readings in Russian. Not checked on the page.
- MEDIUM: Fuchs, *Russische Conversations-Grammatik* plus **Schlüssel** (answer key) (1871, German, Gaspey-Otto-Sauer;
  IA schlsselzurruss00fuchgoog). PD. Old orthography.
- Wikibooks: Portuguese *Russo* 42 pages (141 KB); Italian *Russo* 26 (183 KB); Polish *Rosyjski* 10; Spanish *Ruso* 9;
  French *Enseignement du russe* 8. Russian Wikibooks *Русский язык как иностранный* is 4 pages (16 KB), a stub.
- AVOID: *Russische grammatica* (Groningen, BY-NC-SA, found via OERSI).

## Ukrainian (planned)

- Nothing open found. Repository manuals (KhADI, TNTU Matsiuk, KROK) have no licence. The Innsbruck textbook is only
  described in a CC BY article; the book's own licence was not found. Global Storybooks has uk stories (CC BY 4.0).

## Macedonian

- Nothing open in Macedonian or other languages. UKIM's textbooks for foreigners (Božilak etc.) are ©. No Global
  Storybooks set. The first doc's conclusion stands: the point list must be written by us.

## Modern Greek

- Global Storybooks el: 40 stories (CC BY 4.0).
- Leads not verified: Φωτόδεντρο (photodentro.edu.gr) learning objects have per-item CC licences, often NC; check per
  item. The "Παιδεία Ομογενών" books (University of Crete, 250 free e-books) are free to read; licence not found **[?]**.
- Wikibooks: Portuguese *Grego moderno* 24 pages (439 KB); Italian *Greco moderno* 21; Spanish *Griego moderno* 5.

## Turkish

- AVOID: PIKTES/MEB *Yabancı Öğrenciler İçin Türkçe* (4 books, workbooks, exercise books, 20 graded readers A1–B2).
  The site says "© Copyright PIKTES. Tüm hakları saklıdır." Free to download, not open. The İstanbul and Yedi İklim
  series are also ©.
- LOW: Turkish Wikibooks *Yabancı Dil Olarak Türkçe* (Turkish taught in Turkish) is 4 pages (22 KB); *Türkçe* is
  26 pages. MEDIUM: Global Storybooks tr, 42 stories (CC BY 4.0). Spanish Wikibooks *Turco* has 26 pages.

## Icelandic

- AVOID: *Íslenska fyrir alla* (four books plus audio for adults) is CC BY-NC-ND 4.0. Icelandic Online is ©.
- Nothing new and open. DMII/BÍN (first doc) is still the core.

## Arabic (MSA)

- No Arabic-language CC textbook for non-native speakers found ("المشاع الإبداعي" searches). Umm al-Qura *al-Kitāb
  al-asāsī* on IA has no licence, and the Medina books are ©.
- MEDIUM: **Arabisch für Anfänger** (Uni Marburg, Amal Ali, ILIAS), CC BY 4.0 **[meta]**,
  https://ilias.uni-marburg.de/goto.php/copa/4436242
- MEDIUM: **Arabic Level One** (Hanaa Alkassas, Cuyamaca College, LibreTexts), "shared under a CC BY 4.0 license"
  **[page]**, 12 chapters, in English with Arabic. Levels Three and Four and *Introduction to Arabic* are on LibreTexts
  too, CC BY per OERSI **[meta]**. (MSU *Elementary Arabic* is BY-NC on its own page, so avoid it.)
- LOW: Inholland *Studiehandleiding ARABISCH 1/2* (Dutch, CC BY-SA 4.0 **[meta]**).
- Wikibooks: Italian *Arabo* 28 pages; French *Arabe* 8; Portuguese *Árabe* 14; German *Arabisch* 3 (25 KB).

## Latin

- MEDIUM: German Wikibooks *Latein* (178 pages, 866 KB), including *Anfängerkurs* lessons; French *Latin* (45 pages,
  238 KB); Italian *Latino* (81 pages, 341 KB, 11 exercise pages); Spanish *Latín* (16 pages, 199 KB); Portuguese
  *Latim* (44 pages, 304 KB). All CC BY-SA.
- LOW: French Wikiversity *Latin* department (19 lesson pages: declension, conjugation, prepositions).
- LOW: Graz *DE VENTIS* (differentiated first-year texts with exercises, CC BY-SA 4.0 **[meta]**).
- Not a Latin course: "Québec latina" (Pressbooks, CC BY-SA) is about Latin-American communities in Québec.

## Ancient Greek

- LOW-MEDIUM: French Wikibooks *Grec ancien* (205 pages, 1.08 MB, 9 exercise pages) and Italian *Greco antico*
  (37 pages, 700 KB), CC BY-SA.
- LOW: French Wikiversity *Grec ancien* department (41 grammar pages: all indicative tenses, optative, subjunctive,
  pronoun declension).
- LOW: Kaegi's school grammars are PD (Kaegi died 1923), but no IA copy turned up in this search.
- **HIGH: Peek, *Ancient Greek I* (2021) and *Ancient Greek II* (2025): A 21st-Century Approach** (Open Book
  Publishers). Crossref licence field: https://creativecommons.org/licenses/by/4.0/ for both. doi 10.11647/OBP.0264
  and 10.11647/OBP.0441. Free PDF/HTML at OBP. Written in English; not in the first doc. OBP returned 429 to
  WebFetch, so I have not read the page itself.
- French Wikibooks *Grec ancien* is mostly a lexicon page (576 KB) and 89 pages on gods; little graded grammar.

## Sanskrit

- MEDIUM: **Stenzler, *Elementarbuch der Sanskrit-Sprache*** (German; grammar, texts, glossary). Editions 1868–1915;
  the 1915 edition was revised by Pischel and Geldner, and Geldner died in 1929, so it is PD. IA:
  elementarbuchder00sten_0 (1868), elementarbuchde00geldgoog (1892), in.ernet.dli.2015.404817 (1915). Devanagari
  OCR is poor, so re-key.
- Wikibooks: Spanish *Sánscrito* 11 pages (thin).
- edusources.nl has three Dutch Sanskrit videos (CC BY); low value.

## German

- MEDIUM: **Deutschlernsnacks** (Georg-August-Universität Göttingen, openILIAS), CC BY-SA 4.0 **[meta]**. A numbered
  series (≥64) of DaF self-study units on academic German (paraphrasing, note-taking, Wissenschaftssprache,
  adversative connectors). In German with exercises. Example: http://openilias.uni-goettingen.de/openilias/goto_openilias_lm_1349.html
- LOW: ZUM-Unterrichten (unterrichten.zum.de, CC BY-SA) has a page *Deutsch als Zweitsprache* (13 KB) and
  *Sprachbildung/Sprachwissen* grammar pages (n-Deklination, Komposita). Mostly link lists.
- German Wikibooks has a "Regal:Deutsch als Fremdsprache" shelf (see table). Spanish Wikibooks *Alemán* (154 pages,
  513 KB) and French *Enseignement de l'allemand* (58 pages) teach German in Spanish/French.
- AVOID: Masaryk *Übungsbuch der deutschen Grammatik* (BY-NC-ND, munispace.muni.cz).

## French

- **HIGH: Grammaire française : approche interactive et visuelle** (Kanstantsin Tsedryk, U. Waterloo,
  eCampusOntario Pressbooks), CC BY-SA 4.0 **[meta]**. In French, B1–B2: noun, pronouns, prepositions, future,
  conditional, subjunctive, conjunctions, participles; H5P exercises. https://ecampusontario.pressbooks.pub/grammaire/
  (Pressbooks returns 403 to scripts; fetch with a browser UA or the EPUB export.)
- **HIGH: Grammaire Ouverte** (James Law), 28 chapters in four parts (noms et pronoms, modificateurs, verbes,
  transformations). Each concept is introduced by a literary excerpt with questions. PDF and online. Licence "CC BY"
  on the Open Textbook Library record **[page]**. https://open.umn.edu/opentextbooks/textbooks/grammaire-ouverte
- LOW [?]: *Résumer, synthétiser, argumenter* (eCampusOntario, advanced FLS, interactive exercises); licence not seen.
- No FLE course on French Wikibooks (the search found none).

## Spanish

- LOW-MEDIUM: Spanish Wikibooks *Aprender español* (32 pages, 29 KB, mostly vocabulary; Spanish taught in Spanish)
  and *Español* (149 pages, 407 KB, a descriptive grammar in Spanish).
- MEDIUM: *Antología abierta de literatura hispana* (Julie Ann Ward ed.), CC BY 4.0 **[meta]**, an annotated reader in
  Spanish (Rebus/eCampusOntario/LibreTexts).
- AVOID: Spanish Ministry redELE/Biblioteca virtual. The aviso legal allows reproduction only "siempre que se mantenga
  su integridad" (no derivatives), and other content is for private use only. *Manual de gramática básica y avanzada*
  (UMass) and *Español práctico* are BY-NC.

## Portuguese (Brazilian)

- No open PLE/PLAc book in Portuguese found. *Pode Entrar* (ACNUR/Cáritas 2015) is free, but no licence was found and
  acnur.org returns 403 to scripts **[?]**. eduCAPES has no CC BY PLE item. Portal do Professor de PLE is BY-NC-SA, so
  avoid it.
- MEDIUM: Portuguese Wikibooks **Português para estrangeiros** (17 pages, 64 KB, CC BY-SA), in Portuguese:
  pronunciation, nouns, pronouns, numerals, indicative parts 1–2 (with an exercise page), subjunctive, linking verbs,
  sentence types, adjective clauses, vocabulary.
- Global Storybooks pt (global-pb), CC BY 4.0.

## English (for Brazilians)

- **MEDIUM-HIGH: Portuguese Wikibooks *Inglês*** (120 pages, 278 KB, CC BY-SA), written in Portuguese for Brazilians.
  *Inglês/Gramática* has one page per grammar point (adjective position, comparative/superlative/inferiority, -ing/-ed
  adjectives, adverbs, still/yet/already, so/such, enough/too, ever, quite/rather, question tags, dates). *Inglês/Curso*
  has 10 basic lessons with vocabulary pages and 2 intermediate lessons. It is a ready Portuguese-language point list for
  the English course.
- Polish *Angielski* (79 pages) and Russian *Самоучитель английского языка* (27 pages, 260 KB) are the same idea in
  other languages.

## Japanese

- **MEDIUM-HIGH: MEXT 教材例集** (see top 10 #7). Page:
  https://www.mext.go.jp/a_menu/nihongo_kyoiku/kyoiku/nihongo_curriculum/index_3.html. Rules:
  https://www.mext.go.jp/b_menu/1351168.htm ("本利用ルールは、クリエイティブ・コモンズ・ライセンスの表示4.0国際 … と互換性があり、
  本利用ルールが適用されるコンテンツはCC BYに従うことでもコンテンツを利用することができます"). The same rules cover other MEXT
  Japanese-education pages (the 日本語教育の参照枠 documents on mext.go.jp). The old bunka.go.jp copies have no open terms,
  so use the mext.go.jp copies.
- MEDIUM: **Japanese Wikibooks 日本語/非母語話者むけ** (Japanese for non-native speakers, written in Japanese, CC BY-SA),
  about 30 pages: kana, 五十音図, accent, a verb conjugation table, grammar pages (動詞, 名詞, 基本助詞, 形容詞, 指示詞,
  比較, 終助詞, 自動詞・他動詞), lessons (授受表現, 時刻, 動作の並行), vocabulary and 読解練習. Thin, but it is the target type.
- Wikibooks in other editions: Polish *Japoński* 131 pages (528 KB, 6 exercise pages); French *Japonais* 143 pages
  (678 KB) plus *Japonais/Grammaire* 16; German *Japanisch* 88 (385 KB); Spanish *Japonés* 339 (mostly kanji pages;
  *Lecciones* is 15 pages); Italian *Giapponese* 30; Russian *Японский язык* 11 pages (2.1 MB, large tables).
- AVOID: いろどり (JF: reuse and modification only for education, no separate materials); KCよむよむ (JF Kansai, CC BY-NC
  2.1 JP); みんなの教材サイト (NC). 日本語文型バンク (NINJAL, N5–N4 grammar points with examples): licence not found **[?]**.

## Korean

- **HIGH (licence caveat): NIKL materials on 한국어교수학습샘터.** The usage page (https://kcenter.korean.go.kr/kcenter/teaching/faq.do)
  says: "국립국어원에서 개발한 한국어 교육자료(교재 및 지도서 PDF, 수업용 PPT 등)를 … 공공누리 제1유형으로 공개합니다. 현재 출판 중인 교재는
  공공누리 제4유형으로 전자책 게시". It also says: "공공누리는 국민을 대상으로 하는 제도로, 국내법이 적용되는 곳에 한하여 해당 조건으로 사용이
  가능합니다 … 외국인 및 국외 기관에서 저작물을 사용하는 경우 [이용허락 필요]". Series include materials for marriage
  immigrants, school-age KSL, overseas adults and KIIP (the 2020 KIIP books are probably still in print, so type 4).
  The item lists are JavaScript-rendered; check the type badge on each item. A grammar search
  (/kcenter/search/dgrammar.do) exists. Recommendation: ask NIKL for permission (form on the site) before shipping
  NIKL content, including the 336-point list from the first doc.
- AVOID: 세종학당 data on data.go.kr (제4유형: "출처표시, 상업적 이용금지, 변경금지").
- Global Storybooks ko: 43 stories (CC BY 4.0). Wikibooks: French *Coréen* 41 pages; Spanish *Coreano* 19.

## Chinese

- MEDIUM: Bochum **"Shouki"** Anki decks for Modern Chinese I–IV and Classical Chinese I–II (CC BY 4.0 **[meta]**),
  https://open.ruhr-uni-bochum.de/lernangebot/shouki-projekt-fuer-sprachkurse-modernes-chinesisch-i-iv-und-klassisches-chinesisch-i/
- LOW: Seidel, *Chinesische Konversations-Grammatik* plus Schlüssel (1901, PD; IA bub_gb_yS4QAAAAYAAJ), old romanisation.
- Lead: the 国际中文教育中文水平等级标准 (GF 0025-2021) grammar list (572 graded points). It is a state language
  standard, not openly licensed. Art. 5 of the Chinese Copyright Law (official documents) is arguable. Do not import it
  without a decision.
- No 对外汉语 CC textbook found. Global Storybooks zh (CC BY 4.0). Wikibooks: Spanish *Chino* 43 pages; Italian *Cinese*
  23; French *Chinois* 12.

## Italian (planned)

- LOW: Italian Wikibooks *Italiano L2* (10 pages, 41 KB) and *Italiano per migranti A2* (1 page) teach Italian in
  Italian but are stubs. Italian *Italiano* (59 pages, 396 KB) is a grammar written for native speakers.
- French Wikibooks *Enseignement de l'italien* 62 pages (304 KB); Spanish *Italiano* 67. GALILEO *Elementary Italian
  I & II* (CC BY 4.0, English). Global Storybooks it.

## Dutch (planned)

- MEDIUM: Wikiwijs *Lesmateriaal NT2* (https://maken.wikiwijs.nl/121286), "Naamsvermelding 4.0 Internationaal" (CC BY)
  per search snippet **[?]**. KlasCement NT2 filter: 27 BY and 4 BY-SA items to check one by one.
- French Wikibooks *Néerlandais* is large: 227 pages, 531 KB, 30 exercise pages.

---

## Wikibooks courses in other language editions (measured 2026-10-20)

Counts come from the MediaWiki API (pages = root plus subpages; size = summed wikitext bytes; "ex" = subpages whose
title names exercises/Übungen/exercices). All are CC BY-SA 4.0. Only books with more than 5 pages are listed.

| Target | Edition: book (pages / KB / ex) |
|---|---|
| Latin | de: *Latein* (178 / 845); nl: *Latijn* (29 / 460); it: *Latino* (81 / 333 / 11 ex); pt: *Latim* (44 / 296 / 4 ex); fr: *Latin* (45 / 232); es: *Latín* (16 / 194); zh: *拉丁語* (30 / 118 / 4 ex); pl: *Łacina* (15 / 28); fi: *Latinan kieli* (6 / 22); is: *Latína* (12 / 15); cs: *Latina* (8 / 6) |
| Ancient Greek | fr: *Grec ancien* (205 / 1058 / 9 ex); it: *Greco antico* (37 / 683); nl: *Oudgrieks* (108 / 314 / 1 ex); pt: *Grego antigo* (6 / 13) |
| Sanskrit | es: *Sánscrito* (11 / 11) |
| Arabic | it: *Arabo* (28 / 134 / 3 ex); tr: *Arapça* (14 / 50); fr: *Arabe* (8 / 40); pl: *Arabski* (7 / 36); pt: *Árabe* (14 / 10) |
| German | es: *Alemán* (154 / 500 / 3 ex); pl: *Niemiecki* (83 / 230 / 1 ex); tr: *Almanca* (70 / 167); fr: *Enseignement de l'allemand* (58 / 148 / 7 ex); nl: *Duits* (39 / 123); pt: *Alemão* (39 / 110); ja: *ドイツ語* (51 / 39 / 1 ex); cs: *Němčina* (18 / 28) |
| Russian | it: *Russo* (26 / 178); pt: *Russo* (42 / 137 / 2 ex); ko: *러시아어 입문* (16 / 67); zh: *俄语* (14 / 63); nl: *Russisch* (19 / 62); pl: *Rosyjski* (10 / 32); ja: *ロシア語* (7 / 22); fr: *Enseignement du russe* (8 / 21); es: *Ruso* (9 / 17); cs: *Ruština* (7 / 9) |
| Modern Greek | pt: *Grego moderno* (24 / 428); ko: *현대 그리스어 입문* (10 / 62); it: *Greco moderno* (21 / 50) |
| Finnish | fi: *Suomen kieli* (47 / 126); pt: *Finlandês* (38 / 116); es: *Finés* (41 / 78 / 1 ex); pl: *Fiński* (31 / 37); it: *Finlandese* (13 / 35) |
| Czech | ko: *체코어* (65 / 203); cs: *Čeština* (24 / 128); pl: *Czeski* (14 / 22) |
| Polish | de: *Polnisch* (54 / 165); fr: *Polonais* (25 / 69); nl: *Pools* (34 / 68); pt: *Polonês* (17 / 49); es: *Polaco* (22 / 30); cs: *Polština* (6 / 10); zh: *波兰语* (7 / 7) |
| Turkish | tr: *Türkçe* (26 / 62); es: *Turco* (26 / 39); nl: *Turks* (14 / 35) |
| Hungarian | de: *Ungarisch* (1506 / 129829 / 1 ex); cs: *Maďarština* (53 / 191); tr: *Macarca* (7 / 18) |
| Icelandic | de: *Isländisch* (17 / 72); pt: *Islandês* (37 / 63); cs: *Islandština* (6 / 16) |
| Portuguese | es: *Portugués* (41 / 73); pt: *Português para estrangeiros* (17 / 62 / 2 ex); fr: *Enseignement du portugais* (14 / 34) |
| French | es: *Francés* (120 / 320 / 16 ex); nl: *Frans* (25 / 101); ja: *フランス語* (25 / 78); pt: *Francês* (24 / 50 / 1 ex); it: *Francese* (24 / 41); tr: *Fransızca* (13 / 40); pl: *Francuski* (24 / 34); zh: *法语* (8 / 22); is: *Franska* (11 / 13) |
| Spanish | de: *Spanisch* (31 / 514); es: *Español* (149 / 397 / 2 ex); tr: *İspanyolca* (45 / 149 / 9 ex); nl: *Spaans* (25 / 108 / 2 ex); it: *Spagnolo* (42 / 90 / 9 ex); pt: *Espanhol* (88 / 87); pl: *Hiszpański* (23 / 69 / 1 ex); zh: *西班牙语* (17 / 32); es: *Aprender español* (32 / 28); fr: *Enseignement de l'espagnol* (17 / 18); cs: *Španělština* (13 / 15) |
| English | zh: *英语* (63 / 822 / 1 ex); es: *Inglés* (97 / 359 / 1 ex); pt: *Inglês* (120 / 271 / 1 ex); ru: *Самоучитель английского языка* (27 / 253); pl: *Angielski* (79 / 244 / 2 ex); ja: *英語* (14 / 228); it: *Inglese* (43 / 100); is: *Enska* (15 / 96); nl: *Engels* (39 / 83); tr: *İngilizce* (22 / 61); cs: *Angličtina* (18 / 40) |
| Japanese | pt: *Japonês* (88 / 3375); ru: *Японский язык* (11 / 2089); fr: *Japonais* (143 / 661 / 4 ex); es: *Japonés* (339 / 616); pl: *Japoński* (131 / 515 / 6 ex); de: *Japanisch* (88 / 375); zh: *日语* (52 / 323 / 1 ex); ja: *日本語* (49 / 286 / 1 ex); uk: *Японська мова* (26 / 133); fr: *Japonais/Grammaire* (16 / 128); it: *Giapponese* (30 / 106 / 6 ex); cs: *Japonština* (14 / 35); fi: *Japanin kieli* (6 / 30); tr: *Japonca* (14 / 25) |
| Korean | tr: *Korece* (22 / 269); fr: *Coréen* (41 / 132); ja: *朝鮮語* (19 / 88); es: *Coreano* (19 / 27); pl: *Koreański* (15 / 20) |
| Chinese | es: *Chino* (43 / 186); it: *Cinese* (23 / 118); pl: *Chiński* (15 / 84); fr: *Chinois* (12 / 66); zh: *汉语* (10 / 35); fi: *Kiinan kieli* (6 / 11) |
| Italian | it: *Italiano* (59 / 387 / 5 ex); fr: *Enseignement de l'italien* (62 / 296); nl: *Italiaans* (49 / 291); de: *Italienisch* (67 / 181); es: *Italiano* (67 / 158); pt: *Italiano* (79 / 66); it: *Italiano L2* (10 / 39); ja: *イタリア語* (9 / 14) |
| Ukrainian | ru: *Украинский язык* (8 / 109); uk: *Українська мова* (12 / 52); pl: *Ukraiński* (17 / 48) |
| Dutch | fr: *Néerlandais* (227 / 518 / 30 ex); nl: *Nederlands* (103 / 467); de: *Niederländisch* (21 / 117); es: *Neerlandés* (22 / 34); pt: *Holandês* (13 / 23); zh: *荷兰语* (7 / 18); pl: *Niderlandzki* (14 / 18) |

Useful self-teaching books in this table (the language taught in itself): fi *Suomen kieli* (learner-oriented: grammar, "Suomen kieli käyttöön" reading texts, contents in en/ru/fi); pt *Português para estrangeiros*; ja *日本語/非母語話者むけ* (a part of ja *日本語*); es *Aprender español*; it *Italiano L2*; tr *Türkçe* and *Yabancı Dil Olarak Türkçe* (4 pages). cs *Čeština*, nl *Nederlands*, it *Italiano* and es *Español* are grammars written mainly for native speakers. Large outliers (pt *Japonês* 3.4 MB, ru *Японский язык* 2.1 MB, de *Ungarisch* 130 MB) are dominated by big tables or reader pages. Hungarian and Swedish Wikibooks had none of the guessed titles; German Wikibooks also has a shelf, *Regal:Deutsch als Fremdsprache*.

## Searched with nothing open found

Czech NPI/inkluzivniskola (BY-NC); Polish ZPE item pages (licence not shown); Hungarian MID textbooks; Turkish
yabancılara Türkçe (all ©); Greek Kallipos (DaF title BY-NC-SA, no Greek L2 title); Icelandic (NC-ND); Macedonian
(©); Arabic العربية للناطقين بغيرها (©); Russian РКИ (©); Ukrainian (no licence); Spanish ELE (BY-NC or ©);
Portuguese PLE (no licence); Japanese JF (NC); Zenodo (articles only); OAPEN REST API (blocks scripts).
