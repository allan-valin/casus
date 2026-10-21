# Translate every imported (human-written) Learn lesson into all interface languages (Allan, 2026-10-20)

Allan: imported books must exist in en/pt/de/mk/ar; a translation is tagged **AI-translated** (not AI-written, as long
as meaning is kept); open-source MT + proofreading for meaning is fine — careful, two languages on every page (only
the explanation is translated, examples in the taught language stay). Human lessons carry a 👤 mark (done 3ea7843).
A toggle switches between the translation and the original; default = the UI language.

## Engine
MADLAD-400 3B (Apache 2.0), CTranslate2 int8 (vendor/mt/madlad400-3b-ct2), RTX 4050 6 GB, batch 8.
Bench 2026-10-20: beam 1 ≈ 1100 chars/s, beam 2 ≈ 780 chars/s (en→pt, Peek prose). Cache per UI: vendor/mt/cache.<ui>.json
(never versioned; a rebuild re-applies it). Run: desembarque/.venv-ocr python with LD_LIBRARY_PATH = its nvidia/cublas/lib.

## Volume (imported text, chars, 2026-10-20)
hu 68.8M (63M = Lesebuch sentence lists, German side only) · grc 4.7M · la 4.0M · de 2.3M · es 2.1M · pt 2.0M · nl 1.8M ·
sa 1.7M · ja 1.6M · fr 1.6M · it 1.4M · ru 1.3M · en 1.2M · fi 0.7M · zh 0.7M · el 0.6M · pl/tr/ko 0.5M · cs 0.4M ·
ar 0.4M · uk 0.3M · is 0.2M · mk 0.03M.

## Priority (course > UI) — updated 2026-10-20 night: de>mk and de>ar FIRST, then ko>pt, ja>pt, fr>pt, en>pt, it>pt and the rest over several days

## Steps
1. [ ] Ledger + memory pointer (this file)
2. [x] mt_html: translate prose in any source language (not only English); per-block language detection; taught-language
       text protected; tests
3. [x] translate_learn: any UI (en pt de mk ar); page gets mt[ui] and src (original's language); tests
4. [x] Learn page: ⇄ AI-translated badge + toggle translation / original (default translation in UI language); tests
5. [x] Proofreading: automatic checks (examples intact, ratio, untranslated runs, placeholder loss) + sample read per book
6. [ ] Pairs done (translated → checked → released):
       - [x] ko>pt  - [ ] ja>pt  - [x] de>ar  - [x] de>mk  - [ ] fr>pt  - [ ] en>pt  - [ ] it>pt  - [ ] …

## Log
- 2026-10-20: steps 2–3 (any explanation language, any UI; original kept as html.orig when translating into English).
- 2026-10-20: step 4 (⇄ badge naming the original's language, toggle original/translation, default translation).
- 2026-10-20: cache-only re-application (translate_learn --cache-only; build_learn does it for every UI cache) so rebuilds keep translations. Step 5 checker: tools/mt_check.py <code> --ui <ui> → data/<code>/mt-check.<ui>.json.
- 2026-10-20: ko>pt DONE and released (286 pages; 82 sections checked, 1 flagged; 2404 sentences, 46 kept in the
  original). Proofreading found and fixed: missing </s> (model invented clauses — ALL earlier MT discarded, incl. this
  morning's cache.de), entities, line breaks, loops (output > 2× input rejected), IPA and other-script words now
  protected, placeholder retry with braces, "used to mean"/"tense" corrections in tools/mt_fixes/pt.yml.
  Settings: beam 2, batch 16 (bench: 4 → 600 chars/s, 16 → 1650, 24 → 1950 but 5.6 GB peak), no_repeat_ngram 6, decode ≤ 512; CJK pieces ≤ 200 chars.
  After each pair: release_data.sh <code>, merge to main, push, run the casus-asia and casus-world workflows, live-check (Allan checks each pair).
  Run: tools/mt.sh <ui> <code> [--redo]; check: python3 tools/mt_check.py <code> --ui <ui>; then release_data.sh <code>.
- 2026-10-20 evening: ko>pt REDONE and released after Allan found French left in the French Korean book: links were
  protected like examples (now prose), short lines/dialogue not prose (fixed), NIKL intros were English copies under pt
  (builder fixed, data patched), Wikibooks navigation panels dropped. Check: 355 sections, 12 flagged (fragments).
  ja>pt: kanbun crashed the GPU (crowded runs skipped); output-length guard rejected right Japanese translations
  (now ×5 for CJK; 7026 rejected sentences purged and redone); batch 16 scaled down for long inputs.
- 2026-10-20 (Allan, after ko check): proofreading means READING each pair, not just the checker. Per pair: the checker
  (now also flags examples without a meaning line), then by eye: a sample of every book, both sides, judged on whether a
  learner gets the meaning (labels, examples, links, headings) — record findings + fixes here. Structural gaps found by
  Allan in ko: NIKL examples had no meaning (MT lines added in every UI), "— particle." untranslated (label now a phrase).
  Words in Learn now open their dictionary entry (WordEntry), as in the Reader.
- 2026-10-20 night: proofreading ja>pt and the new ko example lines found MADLAD INVENTS from Japanese/Korean straight
  into Portuguese ("「だろう」は助動詞…" → "A palavra 'a' é usada…"; "민준이는 내 아들이 아니고 조카다" → "Ele não é seu filho").
  Through English (beam 4) it is right in all tested sentences. Now: ja/zh/ko sources and Korean examples pivot via
  English (vendor/mt/cache.en-pivot.json, reused by de/mk/ar); 19,006 directly translated CJK sentences purged; ja and ko
  redone. ja>pt NOT released until a by-eye sample passes. Checker fixed (example pattern, CJK length ratio).
- 2026-10-20 night: ko>pt and ko>en (example lines) RELEASED. By-eye check of the MADLAD example lines (via English):
  ~50% had problems, ~25% serious → all 602 NIKL examples translated by Claude into pt and en (tools/mt_fixes/pt.yml,
  en.yml; de/mk/ar still to do the same way). Rule from this: SHORT idiomatic example sentences = Claude; long prose =
  MADLAD (via English for CJK) + by-eye proofreading + fixes. Badge text now names MADLAD + Claude.
- 2026-10-20 DECISION (Allan): core course per language translated by Claude; MADLAD + sample proofreading for the
  rest. Workflow: tools/mt_pieces.py <code> --ui <ui> --source "<book>" lists the exact pieces (with placeholders) →
  Claude translates them in batches into tools/mt_fixes/<ui>/<slug>.yml → translate_learn --cache-only --redo. ja>pt
  held: JLPT (core) by Claude first; school books MADLAD with classical lines protected.
- 2026-10-21 (Allan): de>mk and de>ar FIRST, then the rest over days. DeepL rejected (no Macedonian, proprietary,
  quota). Benchmark of open models on 45 real German-course sentences (en/es/fr → mk/ar): Macedonian MADLAD best
  (Qwen3-8B writes Serbian-Russian mixtures); Arabic EuroLLM-9B-Instruct best (keeps placeholders and German, most
  fluent), MADLAD drops placeholders/content, LMT-60 mistranslates and transliterates German, Seed-X garbage.
  → Arabic bulk = EuroLLM-9B (tools/llm_server.sh + translate_learn --engine eurollm; own cache
  vendor/mt/cache.ar.eurollm.json); the badge names who translated each page (Claude / EuroLLM-9B / MADLAD-400).
- 2026-10-21: German course core = Grimm Grammar, translated by Claude into mk (4.5k sentences) and ar (3.6k).
  Checking de>mk found and fixed (each with a test): Grimm's bold English glosses kept English ("еден <b>rich</b>
  човек") → bold glosses translated in context; bare IPA turned Cyrillic → kept whole; IPA spans protected;
  "backen (bäckt), backte, gebacken (to bake)" rewritten whole → only the gloss translated; German examples written
  plainly or quoted («Ich bin der Mann», "Wie heißt du?") translated away → protected (German-word test per
  explanation language: English word lists for English books, the es/fr/pl course forms for theirs); German-in-German
  pages (Bohm's Sprachlehre, Kontrastive Syntax) left in German (model cannot tell example from explanation);
  MADLAD's rejected sentences (673, mostly lost placeholders) and 190 verb glosses translated by Claude
  (tools/mt_fixes/mk/de-rescue.yml). Released Korean/Japanese pairs re-checked: 0 sentences missing after the changes.
- 2026-10-21 morning: de>ar EuroLLM run finished (444 pages, 12,110 new sentences; 529 pages carry Arabic: 321
  EuroLLM-9B, 116 Claude + EuroLLM-9B, 92 Claude). mt_check: 213/630 sections flagged, almost all German examples
  read as "untranslated" (same pattern as de>mk); English one-word glosses in word lists stay English, as in mk.
  Read by eye and fixed in the cache: grammar terms the model got systematically wrong — "subject" → موضوع (topic)
  in 141 English + 32 French/Spanish sentences → فاعل; "object" → كائن (creature) in 42 → مفعول به (شيء where it
  means a thing; duals → مفعولين); "décliner" read as "negate" → تصريف; 8 sentences rewritten by hand. Re-applied
  cache-only, released data-de, deployed. de>mk labels re-applied the same way (376 Claude + MADLAD-400).
