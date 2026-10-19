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
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { matchRule, formPool, gapText, spellingVariants, prefixVariants, unsuitable } from './learn_match.mjs';
import { gapRoman } from './learn_examples.mjs';

export const TATOEBA = { mk: 'mkd', ar: 'ara', la: 'lat', grc: 'grc', de: 'deu', ru: 'rus', ko: 'kor', zh: 'cmn', fi: 'fin', el: 'ell', sa: 'san', cs: 'ces', pl: 'pol', tr: 'tur', hu: 'hun', is: 'isl', pt: 'por', en: 'eng', es: 'spa' };
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
  const lemmaOf = (id) => lemmas[id]?.headword;
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
  const toEng = new Map(); for (const [a, b] of rows(`${t3}-eng_links.tsv.bz2`)) if (!toEng.has(a)) toEng.set(a, b);
  const toPor = new Map(); try { for (const [a, b] of rows(`${t3}-por_links.tsv.bz2`)) if (!toPor.has(a)) toPor.set(a, b); } catch { /* none */ }
  const wanted = new Set([...toEng.values(), ...toPor.values()]);
  const eng = new Map(rows('eng_sentences.tsv.bz2').filter(([id]) => wanted.has(id)).map(([id, , t]) => [id, t]));
  const por = new Map(rows('por_sentences.tsv.bz2').filter(([id]) => wanted.has(id)).map(([id, , t]) => [id, t]));

  const index = await json('learn.json');
  const lessons = [];
  for (const level of index.levels) for (const topic of level.topics) for (const e of topic.lessons) {
    const l = await json(`learn/${e.id}.json`);
    if (l.match) lessons.push({ id: e.id, level: level.id, match: l.match, pool: l.pool ?? l.match.pool ?? null, swaps: l.swaps ?? null, prefixes: l.prefixes ?? null, own: new Set(l.examples.map((x) => x.text)) });
  }
  const pool = own.filter(([id, , t]) => toEng.has(id) && eng.has(toEng.get(id)) && t.length <= 70 && !unsuitable(eng.get(toEng.get(id)), t))
    .map(([id, , t]) => ({ id, text: t, s: simplicity(t.split(/[\s.,!?;:„“"]+/u).filter(Boolean), (w) => freq.get(w)) }))
    .sort((a, b) => a.s - b.s);
  const found = new Map(lessons.map((l) => [l.id, []]));
  const t0 = Date.now();
  let read = 0;
  for (const { id, text } of pool) {
    const open = lessons.filter((l) => found.get(l.id).length < PER_LESSON && !l.own.has(text));
    if (!open.length) break;
    const st = createState({ text, lexicon, lang });
    await st.load();
    const blocks = st.blocks();
    read += 1;
    // a gap needs some context: three words at least
    if (blocks.filter((b) => /[\p{L}\p{N}]/u.test(b.token.surface)).length < 3) continue;
    for (const l of open) {
      const m = matchRule(blocks, l.match, { lemmaOf });
      if (!m) continue;
      const gapBlock = blocks[m.gap];
      const answer = gapBlock.token.surface;
      // variety: one formula (Ве молам) must not fill a lesson
      const key = answer.toLocaleLowerCase();
      const seen = l.perAnswer ?? (l.perAnswer = new Map());
      // (a word-list lesson has few answers by nature: it may repeat one, up to 100 times)
      const rulePool = (Array.isArray(l.match) ? l.match[m.rule] : l.match).pool ?? l.pool;
      if (!l.swaps && (seen.get(key) ?? 0) >= (rulePool ? 100 : 12)) continue;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      let wrong = null;
      const rule = Array.isArray(l.match) ? l.match[m.rule] : l.match;
      if (l.swaps) wrong = spellingVariants(answer, l.swaps);
      else if (l.prefixes) wrong = prefixVariants(answer, l.prefixes);
      else if (rule.pool || l.pool) wrong = (rule.pool ?? l.pool).filter((w) => w.toLocaleLowerCase() !== answer.toLocaleLowerCase());
      else {
        const ids = [...new Set(gapBlock.candidates.map((c) => c.analysis.lemma))];
        const codes = gapBlock.candidates.map((c) => c.code).filter(Boolean);
        if (ids.length === 1) {
          const forms = await paradigmOf(ids[0]);
          const mine = forms?.find(([f]) => f === answer.toLocaleLowerCase()) ?? forms?.find(([f]) => f === answer);
          if (forms && mine) wrong = formPool(forms, answer.toLocaleLowerCase(), codes[0] ?? mine[1], decode, 5, rule.same ?? []);
        }
      }
      const roman = (b) => b.roman ?? (romanize ? romanize(b.token.surface) : '');
      const romanBlocks = blocks.map((b) => ({ ...b, roman: /[\p{L}\p{N}]/u.test(b.token.surface) ? roman(b) : '' }));
      found.get(l.id).push({ text, en: eng.get(toEng.get(id)), pt: toPor.has(id) ? por.get(toPor.get(id)) : undefined, answer,
        wrong: wrong?.length >= (l.swaps || l.prefixes ? 1 : 2) ? wrong : null, gap: gapText(text, blocks.map((b) => b.token), m.span), gapRoman: gapRoman(romanBlocks, m.span),
        roman: romanBlocks.map((b) => b.roman).filter(Boolean).join(' '), tok: blocks.map((b) => b.token.surface) });
    }
    if (read % 5000 === 0) console.log(`${read} sentences read (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  let total = 0;
  for (const l of lessons) {
    const mine = found.get(l.id);
    const answers = [...new Set(mine.map((m) => m.answer))];
    const f = path.join(dataDir, 'learn', `q-${l.id}.json`);
    const file = JSON.parse(await readFile(f, 'utf8'));
    file.qs = file.qs.filter((q) => q.source !== 'tatoeba');
    for (const m of mine) {
      const pt = m.pt ? { pt: m.pt } : {};
      file.qs.push({ type: 'gap', source: 'tatoeba', furi: m.gap, roman: m.gapRoman, en: m.en, ...pt, answer: m.answer,
        pool: m.wrong ?? answers.filter((a) => a !== m.answer).slice(0, 30) });
      file.qs.push({ type: 'translate', source: 'tatoeba', furi: [[m.text, null]], roman: m.roman, tok: m.tok, answer: m.en, ...pt });
    }
    total += mine.length;
    await writeFile(f, JSON.stringify(file));
    const lf = path.join(dataDir, 'learn', `${l.id}.json`);
    const page = JSON.parse(await readFile(lf, 'utf8'));
    page.more = mine.slice(0, 8).map((m) => ({ text: m.text, en: m.en, pt: m.pt, roman: m.roman, target: m.answer }));
    await writeFile(lf, JSON.stringify(page));
  }
  const counts = lessons.map((l) => found.get(l.id).length).sort((a, b) => a - b);
  console.log(`${code}: ${read} sentences read, ${total} matches; per lesson min ${counts[0]}, median ${counts[counts.length >> 1]}, max ${counts.at(-1)}; ${counts.filter((c) => c < 20).length} lessons under 20; ${Math.round((Date.now() - t0) / 1000)} s`);
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) main(process.argv[2]);
