#!/usr/bin/env node
/*
 * Word frequency in conversation units (Allan, 2026-10-21: "if a little used word comes in earlier levels, that'd be
 * odd"). Each new item's words are read with Casus's own lexicon (so кујната counts as кујна) and looked up in the
 * language's top-1000 lemma list (data/<code>/frequency.json). In A1 and A2 a new item whose words fall outside it
 * must be a deliberate choice, marked `rare: true` in the unit (Wohnungsgeberbestätigung is needed on day one);
 * more than three unmarked ones in a unit is a warning.
 *
 *   node tools/conversation_freq.mjs mk        # reads public/talk/mk.json, built by tools/build_conversation.py
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WORD = /[\p{L}\p{M}]+/gu;
const EARLY = new Set(['A1', 'A2']);
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
/** a CEFR level as a rank (A1 = 1 … C2 = 6), so the level yardstick (data/<code>/yardstick.json, T5) plugs into the
 * same rank test as the top-1000 list; null for a word no source grades */
export const levelRank = (level) => (LEVELS.includes(level) ? LEVELS.indexOf(level) + 1 : null);
const CLOSED = new Set(['pron', 'det', 'conj', 'prep', 'particle', 'num', 'aux', 'interj']);   // greetings are core too
// the Japanese list is JLPT vocabulary: it leaves out the copula and polite endings, which every A1 sentence uses
const GRAMMAR = new Set(['だ', 'です', 'でした', 'ます', 'ござる', 'ございます']);

/** a headword listed twice (明日 as あした N5 and あす N4) keeps its best rank */
export function rankMap(freq, bare) {
  const m = new Map();
  const put = (k, r) => { if (!m.has(k) || r < m.get(k)) m.set(k, r); };
  for (const f of freq) { put(bare(f.w), f.rank); if (f.reading) put(bare(f.reading), f.rank); }   // Japanese: 御飯 = ごはん
  return m;
}

/** the words of an item; Japanese text has no spaces after the build, its word boundaries are in readings[text].rt */
export function itemWords(text, readings = {}) {
  const rt = readings[text]?.rt;
  return rt ? rt.map(([w]) => w).filter((w) => WORD.test(w) && (WORD.lastIndex = 0, true)) : text.match(WORD) ?? [];
}

/** words of `text` whose best lemma is not among the top `top` (names aside) */
export async function rareWords(text, rankOf, { names = [], top = 1000, readings = {} } = {}) {
  const skip = new Set(names.flatMap((n) => n.match(WORD) ?? []).flatMap((w) => [w, w.replace(/さん$/, '')]));
  const out = [];
  for (const w of itemWords(text, readings)) {
    if (skip.has(w)) continue;
    const r = await rankOf(w);
    if (r == null || r > top) out.push(w);
  }
  return out;
}

export async function unitReport(unit, rankOf, opts = {}) {
  const rare = [];
  for (const it of unit.new_items ?? []) {
    if (it.rare || it.text.includes('〜')) continue;          // 〜 marks a grammar pattern, not a word to look up
    const words = await rareWords(it.text, rankOf, opts);
    if (words.length) rare.push({ item: it.id, words });
  }
  const warning = (opts.everyLevel || EARLY.has(unit.level)) && rare.length > 3
    ? `${unit.id}: ${rare.length} new items with rare words (${rare.map((r) => r.words.join(' ')).join('; ')}) — use frequent words or mark rare: true` : null;
  return { rare, warning };
}

async function main(code) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { getLanguage } = await import('../src/lang/registry.js');
  const { createLexicon } = await import('../src/lib/lexicon.js');
  const lang = getLanguage(code);
  const dataDir = path.join(root, 'data', code);
  const course = JSON.parse(await readFile(path.join(root, 'public', 'talk', `${code}.json`), 'utf8'));
  const freq = JSON.parse(await readFile(path.join(dataDir, 'frequency.json'), 'utf8'));
  const lemmas = JSON.parse(await readFile(path.join(dataDir, 'lemmas.json'), 'utf8'));
  const bare = (w) => String(w).replace(/\s*\(.*\)$/, '').replace(/^(der|die|das) /, '').toLowerCase();   // 'ден (m.)', 'der Tag'
  const rankByHead = rankMap(freq, bare);
  const lexicon = createLexicon({ manifest: JSON.parse(await readFile(path.join(dataDir, 'manifest.json'), 'utf8')), codes: lang.inventory.codes, script: lang.script,
    fetchFile: async (n) => JSON.parse(await readFile(path.join(dataDir, n), 'utf8')),
    fetchShard: async (n) => JSON.parse(await readFile(path.join(dataDir, 'forms', `${n}.json`), 'utf8')) });
  const head = (id) => bare(lemmas[id]?.headword ?? lemmas[id]?.dict_form ?? '');
  const rankOf = async (w) => {
    if (GRAMMAR.has(w)) return 1;
    const ranks = [rankByHead.get(w.toLowerCase())];
    for (const a of [...await lexicon.lookup(w), ...(w !== w.toLowerCase() ? await lexicon.lookup(w.toLowerCase()) : [])]) {
      if (CLOSED.has(a.pos)) return 1;                       // function words are frequent whatever list files them
      if (GRAMMAR.has(head(a.lemma))) return 1;
      ranks.push(rankByHead.get(head(a.lemma)));
    }
    const known = ranks.filter((r) => r != null);
    return known.length ? Math.min(...known) : null;
  };
  // T5 (Allan, 2026-10-27): with a level yardstick each unit is judged against its own level, at every level
  const yardPath = path.join(dataDir, 'yardstick.json');
  const yard = existsSync(yardPath) ? JSON.parse(await readFile(yardPath, 'utf8')) : null;
  const levelOf = async (w) => {
    if (GRAMMAR.has(w)) return 1;
    const ranks = [levelRank(yard[w.toLowerCase()])];
    for (const a of [...await lexicon.lookup(w), ...(w !== w.toLowerCase() ? await lexicon.lookup(w.toLowerCase()) : [])]) {
      if (CLOSED.has(a.pos)) return 1;
      ranks.push(levelRank(yard[head(a.lemma)]));
    }
    const known = ranks.filter((r) => r != null);
    return known.length ? Math.min(...known) : null;
  };
  const names = Object.values(course.cast ?? {}).map((c) => c.name ?? '');
  let warnings = 0;
  for (const u of course.units) {
    const r = yard
      ? await unitReport(u, levelOf, { names, readings: course.readings ?? {}, top: levelRank(u.level) ?? 6, everyLevel: true })
      : await unitReport(u, rankOf, { names, readings: course.readings ?? {}, top: freq.every((f) => f.level) ? freq.length : 1000 });
    if (r.warning) { console.log('warning:', r.warning); warnings += 1; }
    else if (r.rare.length) console.log(`${u.id}: rare (three or fewer, fine): ${r.rare.map((x) => x.words.join(' ')).join('; ')}`);
  }
  console.log(`${course.units.length} units, ${warnings} frequency warnings`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) await main(process.argv[2]);
