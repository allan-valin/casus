#!/usr/bin/env node
/*
 * Exercises from Tatoeba for Learn lessons written for Casus (tools/curricula/<code>/): every sentence with an English
 * translation is read with the reader's own pipeline, and a lesson takes it when its rule (tools/learn_match.mjs)
 * finds the lesson's point there. Each match gives a gap question — the wrong answers are the same word's other real
 * forms from the paradigm tables, or the lesson's word list — and a translation question (English → the language and
 * word order come from it in the page). Up to 200 per lesson, simple sentences first (short, frequent words); the 8
 * simplest also go into the lesson as more examples. Run after tools/build_learn.py <code>.
 *
 * Usage: node tools/learn_curriculum.mjs <code>
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { matchRule, formPool, preferAttested, looksLikeName, dropMarked, dropPartners, shareStem, spellingVariants, prefixVariants, suffixVariants, unsuitable, markOf, rewrite, rowFor, consonantV, followSpelling, rolesOf } from './learn_match.mjs';
import { gapRoman } from './learn_examples.mjs';

export const TATOEBA = { mk: 'mkd', ar: 'ara', la: 'lat', grc: 'grc', de: 'deu', ru: 'rus', ko: 'kor', zh: 'cmn', fi: 'fin', el: 'ell', sa: 'san', cs: 'ces', pl: 'pol', tr: 'tur', hu: 'hun', is: 'isl', pt: 'por', en: 'eng', es: 'spa', fr: 'fra' };
const PER_LESSON = 200;

/** simpler first: fewer words, and words from the top of the frequency list */
export function simplicity(words, rankOf) {
  const ranks = words.map((w) => rankOf(w.toLocaleLowerCase()) ?? 20000);
  return words.length * 2 + Math.max(0, ...ranks) / 500;
}

async function main(code) {
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const { createLexicon, decodeAnalysis } = await import('../src/lib/lexicon.js');
  const { createState } = await import('../src/lib/state.js');
  const { getLanguage } = await import('../src/lang/registry.js');
  const { frontDecode } = await import('../src/app/lib/paradigm.js');
  const lang = getLanguage(code);
  const romanize = lang.script?.romanize ?? null;
  const dataDir = path.join(ROOT, 'data', code);
  const json = async (f) => JSON.parse(await readFile(path.join(dataDir, f), 'utf8'));
  const manifest = await json('manifest.json');
  const lexicon = createLexicon({ manifest, codes: lang.inventory.codes, script: lang.script,
    fetchFile: async (name) => json(name), fetchShard: async (name) => json(`forms/${name}.json`) });
  const lemmas = await json('lemmas.json');
  // Russian headwords carry stress marks (идти́), which lemma patterns leave out; Greek accents are spelling and stay
  const unstress = (w) => (code === 'ru' && w ? w.normalize('NFD').replace(/[\u0300\u0301]/gu, '').normalize('NFC') : w);
  const lemmaOf = (id) => unstress(lemmas[id]?.headword);
  const dictOf = (id) => lemmas[id]?.dict_form ?? lemmas[id]?.headword;
  // compare words as the reader keys them: Arabic bare letters, Latin without macrons, else lower case
  // (Greek keeps its accents and breathings — ὦ is not ᾧ, ἦν is not ἤν — only grave = acute and ς = σ)
  const greek = (w) => w.normalize('NFD').replace(/\u0300/gu, '\u0301').replace(/ς/gu, 'σ').normalize('NFC');
  const key = code === 'grc' ? greek : lang.script?.strip ?? lang.script?.normalize ?? ((w) => w);
  const norm = (w) => key(w).toLocaleLowerCase();
  const freq = new Map((await json('frequency.json').catch(() => [])).map((f) => [f.w.toLocaleLowerCase(), f.rank]));
  const buckets = new Map();
  const paradigmOf = async (id) => {
    const n = Number(id) % 512;
    if (!buckets.has(n)) buckets.set(n, await json(`paradigms/${n}.json`).catch(() => ({})));
    const rows = buckets.get(n)[String(id)];
    return rows ? frontDecode(rows) : null;
  };
  const decode = (c) => decodeAnalysis(c, null, lang.inventory.codes);

  // Tatoeba: sentences with an English translation (and Portuguese where there is one)
  const t3 = TATOEBA[code];
  const bz = (f) => execFileSync('bzcat', [path.join(ROOT, 'vendor', 'tatoeba', f)], { maxBuffer: 1 << 30 }).toString('utf8');
  const rows = (f) => bz(f).split('\n').filter(Boolean).map((l) => l.split('\t'));
  const own = rows(`${t3}_sentences.tsv.bz2`);
  // English is taught to Brazilians: its "translation" side is Portuguese (Tatoeba's eng-por links)
  const side = code === 'en' ? 'por' : 'eng';
  const toEng = new Map(); for (const [a, b] of rows(`${t3}-${side}_links.tsv.bz2`)) if (!toEng.has(a)) toEng.set(a, b);
  const toPor = new Map(); try { for (const [a, b] of rows(`${t3}-por_links.tsv.bz2`)) if (!toPor.has(a)) toPor.set(a, b); } catch { /* none */ }
  const wanted = new Set([...toEng.values(), ...toPor.values()]);
  const eng = new Map(rows(`${side}_sentences.tsv.bz2`).filter(([id]) => wanted.has(id)).map(([id, , t]) => [id, t]));
  const por = new Map(rows('por_sentences.tsv.bz2').filter(([id]) => wanted.has(id)).map(([id, , t]) => [id, t]));

  const index = await json('learn.json');
  const names = new Set((index.names ?? []).map(norm));
  // characters a language's lessons do not use (Chinese: traditional-only characters in a simplified course)
  const avoid = new Set(index.avoid ?? '');
  const avoided = (t) => avoid.size > 0 && [...t].some((c) => avoid.has(c));
  const lessons = [];
  for (const level of index.levels) for (const topic of level.topics) for (const e of topic.lessons) {
    const l = await json(`learn/${e.id}.json`);
    if (l.match) lessons.push({ id: e.id, level: level.id, match: l.match, pool: l.pool ?? l.match.pool ?? null, swaps: l.swaps ?? null, prefixes: l.prefixes ?? null, suffixes: l.suffixes ?? null, own: new Set(l.examples.map((x) => x.text)) });
  }
  // inscription-style text (NVM·EST·FILIVS) is not a model sentence
  const inscription = (t) => /·/u.test(t) || (t.match(/\p{Lu}/gu) ?? []).length > 0.6 * (t.match(/\p{L}/gu) ?? []).length;
  // every word form the language's sentences use in lower case (so not names: Ted is no Latin form): wrong answers
  // should be real, current forms (Whitaker's tables also list archaic ones, puellai, dianad)
  // open texts where Tatoeba has few sentences (Ancient Greek: Xenophon, Lysias from Perseus), vendor/corpora/<code>/*.txt,
  // one sentence a line, no translation (tools/build_corpus.py)
  const corpusDir = path.join(ROOT, 'vendor', 'corpora', code);
  const corpus = [];
  try { for (const f of (await readdir(corpusDir)).filter((x) => x.endsWith('.txt'))) for (const t of (await readFile(path.join(corpusDir, f), 'utf8')).split('\n')) if (t.trim()) corpus.push(t.trim()); } catch { /* none */ }
  const attested = new Set([...own.map(([, , t]) => t), ...corpus].flatMap((t) => t.split(/[^\p{L}\p{M}'-]+/u)).filter((w) => w && w[0] === w[0].toLocaleLowerCase()).map(norm));
  const pool = own.filter(([id, , t]) => toEng.has(id) && eng.has(toEng.get(id)) && t.length <= 70 && !inscription(t) && !avoided(t) && !unsuitable(eng.get(toEng.get(id)), t))
    .map(([id, , t]) => ({ id, text: t, s: simplicity(t.split(/[\s.,!?;:„“"]+/u).filter(Boolean), (w) => freq.get(w)) }))
    .sort((a, b) => a.s - b.s)
    .slice(0, 400000);   // the simplest 400,000 (English has 1.9 million; the rest would only slow the pass)
  const found = new Map(lessons.map((l) => [l.id, []]));
  // the book's own sentences (Latin: D'Ooge's exercises) come first, each for its own lesson; they have no translation
  const drill = [];
  for (const l of lessons) {
    const page = await json(`learn/${l.id}.json`);
    for (const text of page.drill ?? []) drill.push({ id: null, text, only: l.id });
  }
  // a lesson whose every rule needs one of a list of words (most generated lessons) is only tried on sentences that
  // have one of them: with hundreds of lessons and hundreds of thousands of sentences, matching every rule is slow
  for (const l of lessons) {
    const rules = Array.isArray(l.match) ? l.match : [l.match];
    const needs = rules.map((r) => r.seq?.find((c) => c.word)?.word);
    l.needs = needs.every(Boolean) ? new Set(needs.flat().map(norm)) : null;
  }
  const t0 = Date.now();
  let read = 0;
  const texts = corpus.filter((t) => !unsuitable('', t)).map((text) => ({ id: null, text, s: simplicity(text.split(/[\s.,!?;:·;]+/u).filter(Boolean), (w) => freq.get(w)) }))
    .sort((a, b) => a.s - b.s);
  for (const { id, text, only } of [...drill, ...pool, ...texts]) {
    const open = lessons.filter((l) => (!only || l.id === only) && found.get(l.id).length < PER_LESSON && !l.own.has(text));
    if (!open.length) break;
    const st = createState({ text, lexicon, lang });
    await st.load();
    const blocks = st.blocks();
    read += 1;
    // a gap needs some context: three words at least
    if (blocks.filter((b) => /[\p{L}\p{N}]/u.test(b.token.surface)).length < 3) continue;
    const present = new Set(blocks.map((b) => norm(b.token.surface)));
    for (const l of open) {
      if (l.needs && ![...present].some((w) => l.needs.has(w))) continue;
      // one sentence once per lesson (a text repeats its formulas: καὶ ὁ Χαιρεκράτης εἶπεν·)
      const done = l.texts ?? (l.texts = new Set());
      if (done.has(norm(text))) continue;
      const m = matchRule(blocks, l.match, { lemmaOf, dictOf, norm });
      if (!m) continue;
      const gapBlock = blocks[m.gap];
      const rule = Array.isArray(l.match) ? l.match[m.rule] : l.match;
      // a generator of wrong answers belongs to its rule, or to the whole lesson
      const rulePool = rule.pool ?? l.pool;
      const swaps = rule.swaps ?? l.swaps;
      const prefixes = rule.prefixes ?? (Array.isArray(l.match) ? null : l.prefixes);
      const suffixes = rule.suffixes ?? l.suffixes;
      const listLesson = !!(rulePool ?? swaps ?? prefixes ?? suffixes);
      // names (Tom, Mary, Sami…) are no lesson's point, whatever the reader takes them for
      if (names.has(norm(gapBlock.token.surface))) continue;
      if (index.name_stems && looksLikeName(gapBlock.token.surface, index.name_stems)) continue;
      // a gap is a whole written word (Sanskrit: the reader splits sandhi and compounds — दन्तधावनं — into pieces)
      if (index.whole_words) { const tk = gapBlock.token; if (/[\p{L}\p{M}]/u.test(text[tk.start - 1] ?? '') || /[\p{L}\p{M}]/u.test(text[tk.end] ?? '')) continue; }
      // a script written without vowels (Arabic): a form question shows the answer and its wrong answers vowelled, as
      // the paradigm table spells them, and only when the word's row there is certain; the sentence stays as written
      // (the reader's vowelling of a whole sentence can be wrong, and a learner would trust it)
      const vowelled = blocks.some((b) => b.candidates.some((c) => c.analysis?.marked));
      // a word-list answer without the vowel marks the sentence happens to write (the list has none)
      let answer = listLesson ? gapBlock.token.surface.replace(/[\u064B-\u0652\u0670]/gu, '') : gapBlock.token.surface;
      let wrong = null;
      let lemma = null;          // the answer's dictionary word: the inflection cloze gives it (puella → puellārum)
      let nothingReal = false;   // (strict_attested: the paradigm had no form real text uses)
      if (!listLesson) {
        const ids = [...new Set(gapBlock.candidates.map((c) => c.analysis.lemma))];
        const forms = ids.length === 1 ? await paradigmOf(ids[0]) : null;
        const row = forms ? (vowelled ? rowFor(forms, answer, gapBlock.candidates.map((c) => c.analysis), decode, norm)
          : forms.find(([f]) => f === answer) ?? forms.find(([f]) => norm(f) === norm(answer))) : null;
        // no row, or a row the source spells oddly (two vowel marks on one letter, عَالِقُْونَ): no vowelled question
        if (vowelled && (!row || /[ًٌٍَُِ][ًٌٍَُِْ]|ْ[ًٌٍَُِ]/u.test(row[0]))) continue;
        // rowHas: the form the sentence needs must really be that one (لَمْ + jussive; لِمَ "why" + indicative is not)
        if (row && rule.rowHas && !row.slice(1).some((c) => { const f = decode(c); return Object.entries(rule.rowHas).every(([k, v]) => f[k] === v); })) continue;
        if (row) {
          lemma = dictOf(ids[0])?.split(/[,(]/u)[0].trim() || lemmaOf(ids[0]);
          // the answer as the paradigm spells it (vowelled Arabic; Latin without the book's macrons, like its wrong
          // answers), with the sentence's capital
          if (vowelled) answer = lang.code === 'grc' ? row[0].replace(/σ$/u, 'ς') : row[0];
          else answer = answer.normalize('NFD').replace(/[\u0304\u0306]/gu, '').normalize('NFC');   // as written, less the book's macrons (not Greek accents)
          let all = formPool(forms, row[0], row[1], decode, index.exclude_forms ? 40 : 20, rule.same ?? []);
          if (index.exclude_forms) all = dropMarked(all, row[0], index.exclude_forms);
          const real = all.filter((f) => attested.has(norm(f)));
          // too few attested (a name): at least no archaic Latin endings (-ad/-ed/-od ablative, -ai genitive, -om)
          const plain = lang.code === 'la' ? all.filter((f) => !/([aeiou]d|ai|om|eis)$/u.test(f)) : all;
          wrong = (real.length >= 2 ? real : plain);
          // a language whose paradigms run to thousands of derived forms (Turkish): only forms real text has, and
          // for a person drill only the answer's own stem
          if (index.strict_attested) wrong = real;
          if (rule.stem) wrong = shareStem(wrong, row[0], rule.stem);
          if (index.strict_attested && !wrong.length) nothingReal = true;
          // one per spelling: stress or accent variants of a form (дня, дня́) are one choice, and never the answer's
          const seenW = new Set([norm(answer)]);
          wrong = wrong.filter((w) => { const k = norm(w).normalize('NFD').replace(/[\u0300\u0301]/gu, ''); if (seenW.has(k) || k === norm(answer).normalize('NFD').replace(/[\u0300\u0301]/gu, '')) return false; seenW.add(k); return true; }).slice(0, 5);
          // Latin: the paradigm writes u for consonantal v; follow the sentence when it writes v
          if (lang.code === 'la' && /v/i.test(text)) wrong = followSpelling(answer, row[0], wrong.map(consonantV));
          if (lang.code === 'grc') wrong = wrong.map((w) => w.replace(/σ$/u, 'ς'));   // the paradigm data writes final sigma as σ
        }
      }
      // (strict: no paradigm and no rule of its own for wrong answers — the lesson's other answers would be guesses)
      if (index.strict_attested && !listLesson && !wrong && !swaps && !prefixes && !suffixes && !rulePool) continue;
      if (nothingReal) continue;
      // variety: one formula (Ве молам) must not fill a lesson (a word-list lesson has few answers by nature: it may
      // repeat one, up to 100 times)
      const key = norm(answer);
      const seen = l.perAnswer ?? (l.perAnswer = new Map());
      if (!swaps && (seen.get(key) ?? 0) >= (rulePool ? 100 : 12)) continue;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      // (Korean: the letters are inside the syllable block — swap them decomposed, then recompose)
      if (swaps) wrong = code === 'ko' ? spellingVariants(answer.normalize('NFD'), swaps).map((w) => w.normalize('NFC')) : spellingVariants(answer, swaps);
      if (swaps && !wrong.length) { seen.set(key, (seen.get(key) ?? 1) - 1); continue; }   // nothing to misspell: not a spelling question
      else if (prefixes) wrong = prefixVariants(answer, prefixes);
      else if (suffixes) wrong = suffixVariants(answer, suffixes);
      if ((prefixes || suffixes) && !swaps && (rule.attested ?? l.attested)) wrong = preferAttested(wrong, attested, norm);
      // nothing real to offer: no question (a form left with only invented neighbours)
      if ((prefixes || suffixes) && !swaps && (rule.attested ?? l.attested) && !wrong.length) { seen.set(key, (seen.get(key) ?? 1) - 1); continue; }
      // never the answer's other-gender partner (popełniłem / popełniłam): both are right for an unseen speaker
      const partnerPairs = rule.partners ?? l.partners;
      if (wrong && partnerPairs) wrong = dropPartners(wrong, answer, partnerPairs);
      // one choice per word, whatever its capital (Ο / ο), and never the answer itself
      if (wrong) { const low = new Set([answer.toLocaleLowerCase()]); wrong = wrong.filter((w) => { const k = w.toLocaleLowerCase(); if (low.has(k)) return false; low.add(k); return true; }); }
      else if (rulePool) wrong = rulePool.filter((w) => norm(w) !== norm(answer));
      // romanisation: of every word, or (a script without vowels) only when every word's vowels are certain
      const words = blocks.filter((b) => /[\p{L}\p{N}]/u.test(b.token.surface));
      const sure = !vowelled || words.every((b) => markOf(b));
      // the reader's own reading of a word where it has one (Chinese pinyin), else the script's romanisation
      const roman = (b) => (b.roman ? b.roman.split(' / ')[0] : null) ?? (sure && romanize ? romanize(markOf(b) ?? b.token.surface) : '');
      const romanBlocks = blocks.map((b) => ({ ...b, roman: /[\p{L}\p{N}]/u.test(b.token.surface) ? roman(b) : '' }));
      const tokens = blocks.map((b) => b.token);
      done.add(norm(text));
      found.get(l.id).push({ text, shown: text, src: id ? 'tatoeba' : only ? 'drill' : 'text', en: id ? eng.get(toEng.get(id)) : '', pt: id && toPor.has(id) ? por.get(toPor.get(id)) : undefined, answer,
        wrong: wrong?.length >= (swaps || prefixes || suffixes ? 1 : 2) ? wrong : null, gap: rewrite(text, tokens, () => null, m.span),
        // Chinese: the gap's pinyin stays in the line — near-synonyms (很, 非常) would otherwise both fit; the question
        // becomes which characters are written for that sound and meaning
        gapRoman: code === 'zh' ? romanBlocks.map((b) => b.roman).filter(Boolean).join(' ') : sure ? gapRoman(romanBlocks, m.span) : '', roman: romanBlocks.map((b) => b.roman).filter(Boolean).join(' '),
        tok: blocks.map((b) => b.token.surface), lemma, roles: rolesOf(blocks, { lemmaOf }) });
    }
    if (read % 5000 === 0) console.log(`${read} sentences read (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  // the lessons' own examples, read the same way: romanisation (for a script without vowels, only when every word's
  // vowels are certain) and their words for the word-order question
  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const readOwn = new Map();
  const ownGap = new Map();
  for (const l of lessons) {
    const lf = path.join(dataDir, 'learn', `${l.id}.json`);
    const page = JSON.parse(await readFile(lf, 'utf8'));
    for (const ex of page.examples) {
      const st = createState({ text: ex.text, lexicon, lang });
      await st.load();
      const blocks = st.blocks();
      const tokens = blocks.map((b) => b.token);
      const words = blocks.filter((b) => /[\p{L}\p{N}]/u.test(b.token.surface));
      const vowelled = blocks.some((b) => b.candidates.some((c) => c.analysis?.marked));
      const sure = !vowelled || words.every((b) => markOf(b));
      ex.shown = ex.text;
      ex.roman = words.map((b) => (b.roman ? b.roman.split(' / ')[0] : null) ?? (sure && romanize ? romanize(markOf(b) ?? b.token.surface) : '')).filter(Boolean).join(' ');
      readOwn.set(ex.text, { shown: ex.shown, roman: ex.roman, tok: blocks.map((b) => b.token.surface) });
      // the example's gap, worked out as for Tatoeba: in a script without vowels, the answer vowelled from its paradigm
      // row and the nearest forms as wrong answers (else the bare answer among vowelled ones gives itself away)
      // a phrase as the answer (Grimm Grammar marks dem alten Mann): the wrong answers are the same phrase with its
      // first word in its other forms (den alten Mann…), so the shape gives nothing away
      if (ex.target && !vowelled && ex.target.includes(' ')) {
        const words = ex.target.split(/\s+/u);
        const at = blocks.findIndex((b) => norm(b.token.surface) === norm(words[0]));
        const gb = at >= 0 ? blocks[at] : null;
        const ids = gb ? [...new Set(gb.candidates.map((c) => c.analysis.lemma))] : [];
        const forms = ids.length === 1 ? await paradigmOf(ids[0]) : null;
        const row = forms ? (forms.find(([f]) => f === gb.token.surface) ?? forms.find(([f]) => norm(f) === norm(gb.token.surface))) : null;
        if (row) {
          const firstCap = words[0][0] !== words[0][0].toLocaleLowerCase();
          const variants = formPool(forms, row[0], row[1], decode, 5).map((f) => [firstCap ? f[0].toLocaleUpperCase() + f.slice(1) : f, ...words.slice(1)].join(' '));
          if (variants.length >= 2) ownGap.set(`${ex.en}|${norm(ex.target)}`, { answer: ex.target, pool: variants });
        }
      }
      // a one-word answer: the wrong answers are that word's other forms (the lesson's own rule keeps what it keeps)
      if (ex.target && !vowelled && !ex.target.includes(' ')) {
        const gb = blocks.find((b) => norm(b.token.surface) === norm(ex.target));
        const ids = gb ? [...new Set(gb.candidates.map((c) => c.analysis.lemma))] : [];
        const forms = ids.length === 1 ? await paradigmOf(ids[0]) : null;
        const row = forms ? (forms.find(([f]) => f === gb.token.surface) ?? forms.find(([f]) => norm(f) === norm(gb.token.surface))) : null;
        const rule0 = Array.isArray(l.match) ? l.match[0] : l.match;
        if (row && !l.pool && !(rule0.pool)) {
          let pool = formPool(forms, row[0], row[1], decode, index.exclude_forms ? 40 : 5, rule0.same ?? []).filter((f) => norm(f) !== norm(ex.target));
          if (index.exclude_forms) pool = dropMarked(pool, row[0], index.exclude_forms).slice(0, 5);
          if (lang.code === 'grc') pool = pool.map((w) => w.replace(/σ$/u, 'ς'));
          if (pool.length >= 2) ownGap.set(`${ex.en}|${norm(ex.target)}`, { answer: ex.target, pool });
        }
      }
      if (ex.target && vowelled) {
        const gb = blocks.find((b) => norm(b.token.surface) === norm(ex.target));
        const ids = gb ? [...new Set(gb.candidates.map((c) => c.analysis.lemma))] : [];
        const forms = ids.length === 1 ? await paradigmOf(ids[0]) : null;
        const row = forms ? rowFor(forms, gb.token.surface, gb.candidates.map((c) => c.analysis), decode, norm) : null;
        if (row) ownGap.set(`${ex.en}|${norm(ex.target)}`, { answer: row[0], pool: index.exclude_forms ? dropMarked(formPool(forms, row[0], row[1], decode, 40), row[0], index.exclude_forms).slice(0, 5) : formPool(forms, row[0], row[1], decode, 5) });
        else ownGap.set(`${ex.en}|${norm(ex.target)}`, null);
      }
    }
    const sec = page.sections.find((x) => x.id === 'examples');
    if (sec) for (const k of Object.keys(sec.html)) sec.html[k] = page.examples.map((e) => `<div class="ex"><p class="ja" dir="auto">${esc(e.shown)}</p>${e.roman ? `<p class="r">${esc(e.roman)}</p>` : ''}<p class="en">${esc(e[k] ?? e.en)}</p></div>`).join('');
    await writeFile(lf, JSON.stringify(page));
  }
  let total = 0;
  for (const l of lessons) {
    const mine = found.get(l.id);
    // one per word whatever its capital (Ο, ο): the lower-case spelling when the sentences have it (German nouns keep
    // theirs); the quiz gives each choice the answer's capital
    const byLow = new Map();
    for (const m of mine) { const k = m.answer.toLocaleLowerCase(); if (!byLow.has(k) || m.answer === k) byLow.set(k, m.answer); }
    const answers = [...byLow.values()];
    const f = path.join(dataDir, 'learn', `q-${l.id}.json`);
    const file = JSON.parse(await readFile(f, 'utf8'));
    // (questions the builder made from a book — Grimm Grammar's exercises, source 'book' — stay)
    file.qs = file.qs.filter((q) => !['tatoeba', 'drill', 'text'].includes(q.source));
    for (const q of file.qs) {
      const text = q.furi?.map(([t]) => t).join('');
      if (q.type === 'translate' && readOwn.has(text)) { const r = readOwn.get(text); q.furi = [[r.shown, null]]; q.roman = r.roman; q.tok = r.tok; }
      if (q.type === 'gap' && !q.source) {
        const key = `${q.en}|${norm(q.answer)}`;
        if (ownGap.get(key)) Object.assign(q, ownGap.get(key));
        else if (ownGap.has(key)) q.drop = true;               // vowels not certain: no fair question
        else if (/\s/u.test(q.answer ?? '') && !q.pool) q.drop = true;   // a phrase with no phrase-shaped wrong answers
      }
    }
    file.qs = file.qs.filter((q) => !q.drop);
    for (const m of mine) {
      const pt = m.pt ? { pt: m.pt } : {};
      file.qs.push({ type: 'gap', source: m.src, furi: m.gap, roman: m.gapRoman, ...(m.en ? { en: m.en } : {}), ...pt, answer: m.answer, ...(m.lemma ? { lemma: m.lemma } : {}),
        pool: m.wrong ?? answers.filter((a) => a.toLocaleLowerCase() !== m.answer.toLocaleLowerCase()).slice(0, 30) });
      if (m.en) file.qs.push({ type: 'translate', source: m.src, furi: [[m.shown, null]], roman: m.roman, tok: m.tok, answer: m.en, ...pt, ...(m.roles ? { roles: m.roles } : {}) });
    }
    // wrong answers for the lesson's own gap questions, when the lesson has no word list: the answers its sentences give
    if (!(file.pools?.gap?.length)) file.pools = { ...file.pools, gap: answers.slice(0, 40) };
    total += mine.length;
    await writeFile(f, JSON.stringify(file));
    const lf = path.join(dataDir, 'learn', `${l.id}.json`);
    const page = JSON.parse(await readFile(lf, 'utf8'));
    page.more = mine.filter((m) => m.en).slice(0, 8).map((m) => ({ text: m.shown, en: m.en, pt: m.pt, roman: m.roman, target: m.answer }));
    await writeFile(lf, JSON.stringify(page));
  }
  const counts = lessons.map((l) => found.get(l.id).length).sort((a, b) => a - b);
  console.log(`${code}: ${read} sentences read, ${total} matches; per lesson min ${counts[0]}, median ${counts[counts.length >> 1]}, max ${counts.at(-1)}; ${counts.filter((c) => c < 20).length} lessons under 20; ${Math.round((Date.now() - t0) / 1000)} s`);
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) main(process.argv[2]);
