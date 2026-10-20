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

## Priority (course > UI): ko>pt, ja>pt, de>ar, de>mk, fr>pt, en>pt, it>pt, then the rest (all courses × all UIs)

## Steps
1. [ ] Ledger + memory pointer (this file)
2. [x] mt_html: translate prose in any source language (not only English); per-block language detection; taught-language
       text protected; tests
3. [x] translate_learn: any UI (en pt de mk ar); page gets mt[ui] and src (original's language); tests
4. [x] Learn page: ⇄ AI-translated badge + toggle translation / original (default translation in UI language); tests
5. [x] Proofreading: automatic checks (examples intact, ratio, untranslated runs, placeholder loss) + sample read per book
6. [ ] Pairs done (translated → checked → released):
       - [x] ko>pt  - [ ] ja>pt  - [ ] de>ar  - [ ] de>mk  - [ ] fr>pt  - [ ] en>pt  - [ ] it>pt  - [ ] …

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
