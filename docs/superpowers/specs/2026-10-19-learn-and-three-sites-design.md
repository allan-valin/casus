# Learn tab and three sites — design (2026-10-19)

Allan's request: a **Learn** tab with every topic for every level (A1–C2, N5–N1, …), practice questions per lesson
and a practice section for a chosen level range; Japanese, Macedonian, Arabic first, then the order of the language
bar. The project splits into three sites; English (content in pt-BR) and Spanish are added; the interface can be
switched to pt-BR, English, German and each language a site teaches.

His decisions (2026-10-19): one codebase, three sites · Arabic stays in Casus · open licences only (no NC
material), lesson text not covered by an open source is written for Casus and labelled · UI in pt-BR, en, de plus
each taught language.

## 1. Three sites, one codebase

| site | languages | repo / address |
|---|---|---|
| **Casus** (cases) | la, grc, de, ru, ar, fi, el, sa, cs, pl, tr, hu, is | allan-valin/casus → /casus/ (as today) |
| **Asian site** | ja, ko, zh | new repo → /<name>/ |
| **Third site** | pt, mk, en, es | new repo → /<name>/ |

- `src/sites.js` lists each site: name, title, languages, interface languages, accent colour. A build setting
  (`CASUS_SITE=casus|asia|world`) picks one; the language bar, the drills' language menu and the Downloads panel show
  only that site's languages, and each site links to the other two in the footer.
- The code stays in this repo. Each new repo holds only a workflow: it checks out `allan-valin/casus`, builds its site
  (the data comes from this repo's `data` release, as now) and publishes its own GitHub Pages — no tokens needed;
  after a casus push I start those workflows with `gh workflow run`.
- Each site has its own 1 GB, which ends the budget squeeze; the core-only languages (fi, pl, hu, pt, tr) can then
  be rebuilt from their full dumps.
- Old links keep working: Casus's /casus/ja/ pages redirect to the Asian site, /casus/pt/ and /casus/mk/ to the third.

## 2. The Learn tab (/<code>/learn/)

- **Levels**: CEFR A1–C2 for European languages, Arabic, English, Spanish; JLPT N5–N1 (Japanese); TOPIK 1–6
  (Korean); HSK 1–9 (Chinese, the 2021 standard); Latin, Ancient Greek and Sanskrit in three stages (beginner,
  intermediate, reading), as they have no exam levels.
- **Units**: each level has its topics in teaching order — grammar points, the level's vocabulary, can-do goals
  (introduce yourself, past events, …). A lesson shows: the explanation, the form or pattern, examples with
  translations (each opens in the reader), links to the matching cheat-sheet table, and 5–10 practice questions.
- **Practice questions**, generated so they can be checked: choose the meaning (examples), fill the gap (an example
  with the pattern blanked), choose the right form (from the language's tables: case, person, tense), put the words in
  order (the reader's blocks, dragged), match word and meaning (the level's vocabulary). Keys 1–4 / Enter as in the
  drills.
- **Practice section**: pick a level range (e.g. A2–B1, N4–N3); questions mixed from those lessons, missed ones come
  back sooner; progress per lesson kept in the browser.
- **Content per language** (`data/<code>/learn.json`, built by `tools/build_learn.py`):
  - Japanese: OpenJLPT (CC BY-SA 4.0) — 531 grammar points N5–N1 with formation, example, translation, notes; JLPT
    vocabulary and kanji by level (Waller, CC BY); more examples from Tatoeba (CC BY 2.0 FR).
  - Every other language: no open graded syllabus exists, so the topic list per level and the explanations are
    written for Casus from the standard syllabi (Council of Europe level descriptions, the usual textbook order),
    labelled "written for Casus", in `tools/curricula/<code>.yml`; examples from Tatoeba where it has the language,
    else written for Casus; vocabulary by level from our frequency lists.
  - Explanations in pt-BR and English (German interface shows the English ones); English as a taught language has its
    content in pt-BR.
- **Order**: Japanese, Macedonian, Arabic; then Latin, Ancient Greek, German, Russian, Korean, Chinese, Finnish,
  Modern Greek, Sanskrit, Czech, Polish, Turkish, Hungarian, Icelandic, Portuguese, English, Spanish.

## 3. English and Spanish

Reader, drills, proofreading and Learn like Portuguese: no cases, so the colours are the roles (subject, direct and
indirect object) from word order and the marked words; Wiktionary dictionaries (English filtered to its core, it is
the largest), Hunspell (dictionary-en, dictionary-es), LanguageTool (en-US, es), FrequencyWords lists, Tatoeba.

## 4. Interface languages

pt-BR, English and German on every site, plus each site's living taught languages (Casus: Russian, Arabic,
Finnish, Greek, Czech, Polish, Turkish, Hungarian, Icelandic — not Latin, Ancient Greek, Sanskrit; Asian site:
Japanese, Korean, Chinese; third site: Macedonian, Spanish). I translate the ~600 interface strings myself and mark the
translations as written for Casus; English stays the fallback for a missing string.

## 5. Delivery, in order

1. Site split: `sites.js`, build setting, two new repos with their workflows, redirects; live check of all three.
2. Learn framework + Japanese (OpenJLPT), then Macedonian, then Arabic.
3. English and Spanish languages.
4. Learn for the rest, in language-bar order.
5. Interface translations, site by site.

Every step: tests first, real-data check, commit, deploy, live check (as before).

## Not in scope

Speaking practice, accounts or progress across devices, audio courses.
