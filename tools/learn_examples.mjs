#!/usr/bin/env node
/*
 * Exercises from Tatoeba for every Learn lesson (Allan, 2026-10-19: "the same lesson should have dozens, if not hundreds
 * of exercises"). Tatoeba's Japanese sentences (CC BY 2.0 FR, vendor/tatoeba/) with their English and Portuguese
 * translations are read with the reader's own pipeline; a sentence goes to a lesson when the lesson's pattern (the bold
 * part of its examples) is there as whole words, and when all its kanji are of the lesson's level or below. Each gives a
 * gap question and a translation question, with furigana and romaji from the dictionary. At most 200 per lesson,
 * shortest first. Appends to data/ja/learn/q-<lesson>.json.
 *
 * Usage: node tools/learn_examples.mjs ja [limit]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export function findTarget(tokens, target) {
  for (let a = 0; a < tokens.length; a += 1) {
    let s = '';
    for (let b = a; b < tokens.length && s.length < target.length; b += 1) {
      s += tokens[b].surface;
      if (s === target) return [a, b + 1];
    }
  }
  return null;
}

/** a pattern from the lesson title: no ～, alternatives split, and for a verb-like ending its stem too, so conjugated
 * forms are found (ていただく → ていただ: いただきます, いただけませんか) */
export function coresOfTitle(title) {
  const out = [];
  for (const part of String(title).replace(/\(.*?\)|（.*?）|○○/g, '').split(/[・/／]|\s+-\s+/)) {
    const core = part.replace(/[～〜~\s]/g, '').trim();
    if (!core) continue;
    out.push(core);
    if (core.length >= 4 && /[うくぐすつぬぶむるいだ]$/u.test(core)) out.push(core.slice(0, -1));
  }
  return [...new Set(out)];
}

/** [a, b]: from the start of word a, the text begins with core; b is past the last word the core reaches into */
export function findStart(tokens, core) {
  for (let a = 0; a < tokens.length; a += 1) {
    let s = '';
    let b = a;
    while (b < tokens.length && s.length < core.length) { s += tokens[b].surface; b += 1; }
    if (s.startsWith(core)) return [a, b];
  }
  return null;
}

/** is the match of `target` at char `at` inside an occurrence of a longer pattern (も inside ても)? */
export function coveredByLonger(text, at, target, patterns) {
  for (const p of patterns) {
    if (p.length <= target.length || !p.includes(target)) continue;
    for (let i = text.indexOf(p); i >= 0; i = text.indexOf(p, i + 1)) if (i <= at && at + target.length <= i + p.length) return true;
  }
  return false;
}

/** につれて in 家につれていって is 連れて行く: a pattern ending in て right before いく/くる is the motion verb's own て */
export function motionAfter(text, at, target) {
  if (!target.endsWith('て') && !target.endsWith('で')) return false;
  return /^(い[くかきけっこ]|行|く[るれ]|き[たてま]|こ[いな]|来)/u.test(text.slice(at + target.length));
}

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const KANJI = /[一-鿿㐀-䶿]/gu;
export function withinLevel(text, kanjiLevel, level) {
  const max = LEVELS.indexOf(level);
  for (const k of text.match(KANJI) ?? []) {
    const l = kanjiLevel[k];
    if (!l || LEVELS.indexOf(l) > max) return false;
  }
  return true;
}

export function gapOf(blocks, [a, b]) {
  const out = [];
  blocks.forEach((bl, i) => {
    if (i === a) out.push(['＿＿', null]);
    if (i >= a && i < b) return;
    for (const seg of bl.furi ?? [[bl.token.surface, null]]) out.push([seg[0], seg[1] ?? null]);
  });
  return out;
}
export const gapRoman = (blocks, [a, b]) => blocks.flatMap((bl, i) => (i === a ? ['___'] : i > a && i < b ? [] : [bl.roman ?? ''])).filter(Boolean).join(' ');
const furiOf = (blocks) => blocks.flatMap((bl) => (bl.furi ?? [[bl.token.surface, null]]).map(([t, r]) => [t, r ?? null]));

async function main(code = 'ja', limit = Infinity) {
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const { createLexicon } = await import('../src/lib/lexicon.js');
  const { createState } = await import('../src/lib/state.js');
  const { getLanguage } = await import('../src/lang/registry.js');
  const lang = getLanguage(code);
  const dataDir = path.join(ROOT, 'data', code);
  const manifest = JSON.parse(await readFile(path.join(dataDir, 'manifest.json'), 'utf8'));
  const lexicon = createLexicon({ manifest, codes: lang.inventory.codes, script: lang.script,
    fetchFile: async (name) => JSON.parse(await readFile(path.join(dataDir, name), 'utf8')),
    fetchShard: async (name) => JSON.parse(await readFile(path.join(dataDir, 'forms', `${name}.json`), 'utf8')) });
  const bz = (f) => execFileSync('bzcat', [path.join(ROOT, 'vendor', 'tatoeba', f)], { maxBuffer: 1 << 30 }).toString('utf8');
  const rows = (f) => bz(f).split('\n').filter(Boolean).map((l) => l.split('\t'));
  const jpn = new Map(rows('jpn_sentences.tsv.bz2').map(([id, , t]) => [id, t]));
  const toEng = new Map(); for (const [a, b] of rows('jpn-eng_links.tsv.bz2')) if (!toEng.has(a)) toEng.set(a, b);
  const toPor = new Map(); for (const [a, b] of rows('jpn-por_links.tsv.bz2')) if (!toPor.has(a)) toPor.set(a, b);
  const wanted = new Set([...toEng.values(), ...toPor.values()]);
  const eng = new Map(rows('eng_sentences.tsv.bz2').filter(([id]) => wanted.has(id)).map(([id, , t]) => [id, t]));
  const por = new Map(rows('por_sentences.tsv.bz2').filter(([id]) => wanted.has(id)).map(([id, , t]) => [id, t]));
  const kanjiLevel = {};
  for (const n of [...LEVELS].reverse()) {
    const csv = await readFile(path.join(ROOT, 'vendor', 'openjlpt', `kanji-${n.toLowerCase()}.csv`), 'utf8');
    for (const line of csv.split('\n').slice(1)) if (line) kanjiLevel[line.split(',')[0]] = n;
  }
  // the lessons and their patterns
  const index = JSON.parse(await readFile(path.join(dataDir, 'learn.json'), 'utf8'));
  const lessons = [];
  for (const level of index.levels) for (const topic of level.topics) if (topic.kind === 'grammar') for (const e of topic.lessons) {
    const l = JSON.parse(await readFile(path.join(dataDir, 'learn', `${e.id}.json`), 'utf8'));
    const targets = [...new Set(l.examples.map((x) => x.target).filter((t) => t && t.length >= 1))];
    // the title's pattern too, conjugated forms included (matched from a word boundary); single kana only as bold targets
    const cores = coresOfTitle(l.title).filter((c) => c.length >= 2 && !targets.includes(c));
    // a conjunction the book only shows opening a sentence (そうすると) is only taken there
    const opens = (text, at) => at === 0 || /[。！？!?」]/u.test(text[at - 1]);
    const initial = l.examples.length > 0 && l.examples.every((x) => x.target && x.text.indexOf(x.target) >= 0 && opens(x.text, x.text.indexOf(x.target)));
    lessons.push({ id: e.id, level: level.id, topic: topic.id, targets, cores, initial, own: new Set(l.examples.map((x) => x.text)) });
  }
  const byTarget = new Map();
  const add = (t, l, how) => { if (!byTarget.has(t)) byTarget.set(t, []); byTarget.get(t).push({ l, how }); };
  for (const l of lessons) { for (const t of l.targets) add(t, l, 'word'); for (const c of l.cores) add(c, l, 'start'); }
  const targets = [...byTarget.keys()].sort((a, b) => b.length - a.length);
  // every pattern known, for the longer-pattern guard: the bold parts, the title cores, and the titles' alternatives
  const allPatterns = [...new Set([...targets, ...lessons.flatMap((l) => coresOfTitle(l.title)), 'かも', 'でも', 'とも', 'ても', 'ども', 'しも'])];
  // shortest sentences first; each lesson takes up to 200, those within its level's kanji first (the rest have furigana)
  const pool = [...jpn].filter(([id, t]) => toEng.has(id) && eng.has(toEng.get(id)) && t.length <= 45).sort((a, b) => a[1].length - b[1].length);
  const found = new Map(lessons.map((l) => [l.id, []]));
  let done = 0;
  const t0 = Date.now();
  for (const [id, text] of pool) {
    if (done >= limit) break;
    const hits = targets.filter((t) => text.includes(t)).flatMap((t) => byTarget.get(t).filter(({ l }) => found.get(l.id).length < 400 && !l.own.has(text)).map(({ l, how }) => [t, l, how]));
    if (!hits.length) continue;
    done += 1;
    const state = createState({ text, lexicon, lang });
    await state.load();
    const blocks = state.blocks();
    const seen = new Set();
    for (const [t, l, how] of hits) {
      if (seen.has(l.id)) continue;
      const tokens = blocks.map((b) => b.token);
      const span = how === 'word' ? findTarget(tokens, t) : findStart(tokens, t);
      if (!span) continue;
      const at = tokens.slice(0, span[0]).map((x) => x.surface).join('').length;
      if (coveredByLonger(text, at, t, allPatterns) || motionAfter(text, at, t)) continue;
      if (l.initial && !(at === 0 || /[。！？!?」]/u.test(text[at - 1]))) continue;
      seen.add(l.id);
      const answer = tokens.slice(span[0], span[1]).map((x) => x.surface).join('');
      found.get(l.id).push({ text, en: eng.get(toEng.get(id)), pt: toPor.has(id) ? por.get(toPor.get(id)) : undefined, gap: gapOf(blocks, span), furi: furiOf(blocks), target: answer,
        level: withinLevel(text, kanjiLevel, l.level), roman: blocks.map((b) => b.roman ?? '').filter(Boolean).join(' '),
        tok: blocks.map((b) => b.token.surface), gapRoman: gapRoman(blocks, span) });
    }
    if (done % 2000 === 0) console.log(`${done} sentences read (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  // the book's own examples: word-spaced romaji and words (for the romaji list and the word-order question)
  const read = async (text) => { const st = createState({ text, lexicon, lang }); await st.load(); return st.blocks(); };
  const romanOfBlocks = (blocks) => blocks.map((b) => b.roman ?? '').filter(Boolean).join(' ');
  const bookRead = new Map();
  const bookGap = new Map();
  for (const l of lessons) {
    const f = path.join(dataDir, 'learn', `${l.id}.json`);
    const lesson = JSON.parse(await readFile(f, 'utf8'));
    for (const ex of lesson.examples) {
      const blocks = await read(ex.text);
      ex.roman = romanOfBlocks(blocks);
      const span = ex.target ? findTarget(blocks.map((b) => b.token), ex.target) : null;
      bookRead.set(ex.text, { roman: ex.roman, tok: blocks.map((b) => b.token.surface), gapRoman: span ? gapRoman(blocks, span) : undefined });
      if (ex.target) bookGap.set(`${ex.en}|${ex.target}`, span ? gapRoman(blocks, span) : undefined);
    }
    await writeFile(f, JSON.stringify(lesson));
  }
  // questions into each lesson's file
  const levelTargets = new Map(LEVELS.map((n) => [n, [...new Set(lessons.filter((l) => l.level === n).flatMap((l) => [...l.targets, ...l.cores]))]]));
  let total = 0;
  for (const l of lessons) {
    const f = path.join(dataDir, 'learn', `q-${l.id}.json`);
    const stored = JSON.parse(await readFile(f, 'utf8'));
    const file = Array.isArray(stored) ? { pools: {}, qs: stored } : stored;
    const qs = file.qs.filter((q) => q.source !== 'tatoeba');
    for (const q of qs) {
      if (q.type === 'gap') { const r = bookGap.get(`${q.en}|${q.answer}`); if (r) q.roman = r; continue; }
      if (q.type !== 'translate') continue;
      const r = bookRead.get(q.furi.map(([t]) => t).join(''));
      if (r) Object.assign(q, { roman: r.roman, tok: r.tok });
    }
    const mine = found.get(l.id).sort((x, y) => (y.level - x.level) || (x.text.length - y.text.length)).slice(0, 200);
    for (const m of mine) {
      // pools are built in the page (questionsFromFile): the file's gap pool, the other sentences' translations
      qs.push({ type: 'gap', source: 'tatoeba', furi: m.gap, roman: m.gapRoman, en: m.en, ...(m.pt ? { pt: m.pt } : {}), answer: m.target });
      qs.push({ type: 'translate', source: 'tatoeba', furi: m.furi, roman: m.roman, tok: m.tok, answer: m.en, ...(m.pt ? { pt: m.pt } : {}) });
    }
    total += mine.length;
    found.set(l.id, mine);
    const gapPool = [...new Set([...(file.pools.gap ?? []), ...levelTargets.get(l.level)])].slice(0, 80);
    await writeFile(f, JSON.stringify({ pools: { ...file.pools, gap: gapPool }, qs }));
  }
  const counts = lessons.map((l) => Math.min(200, found.get(l.id).length)).sort((a, b) => a - b);
  console.log(`${code}: ${done} sentences read; ${total} matches; per lesson median ${counts[counts.length >> 1]}, ${counts.filter((c) => c >= 50).length}/${counts.length} lessons with 50+ sentences; ${Math.round((Date.now() - t0) / 1000)} s`);
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) main(process.argv[2], Number(process.argv[3] ?? Infinity));
