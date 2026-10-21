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
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const WORD = /[\p{L}\p{M}]+/gu;
const EARLY = new Set(['A1', 'A2']);
const CLOSED = new Set(['pron', 'det', 'conj', 'prep', 'particle', 'num']);

/** words of `text` whose best lemma is not among the top `top` (names aside) */
export async function rareWords(text, rankOf, { names = [], top = 1000 } = {}) {
  const skip = new Set(names.flatMap((n) => n.match(WORD) ?? []));
  const out = [];
  for (const w of text.match(WORD) ?? []) {
    if (skip.has(w)) continue;
    const r = await rankOf(w);
    if (r == null || r > top) out.push(w);
  }
  return out;
}

export async function unitReport(unit, rankOf, opts = {}) {
  const rare = [];
  for (const it of unit.new_items ?? []) {
    if (it.rare) continue;
    const words = await rareWords(it.text, rankOf, opts);
    if (words.length) rare.push({ item: it.id, words });
  }
  const warning = EARLY.has(unit.level) && rare.length > 3
    ? `${unit.id}: ${rare.length} new items with rare words (${rare.map((r) => r.words.join(' ')).join('; ')}) — use frequent words or mark rare: true` : null;
  return { rare, warning };
}

async function main(code) {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const { getLanguage } = await import('../src/lang/registry.js');
  const { createLexicon } = await import('../src/lib/lexicon.js');
  const lang = getLanguage(code);
  const dataDir = path.join(root, 'data', code);
  const course = JSON.parse(await readFile(path.join(root, 'public', 'talk', `${code}.json`), 'utf8'));
  const freq = JSON.parse(await readFile(path.join(dataDir, 'frequency.json'), 'utf8'));
  const lemmas = JSON.parse(await readFile(path.join(dataDir, 'lemmas.json'), 'utf8'));
  const bare = (w) => String(w).replace(/\s*\(.*\)$/, '').replace(/^(der|die|das) /, '').toLowerCase();   // 'ден (m.)', 'der Tag'
  const rankByHead = new Map(freq.map((f) => [bare(f.w), f.rank]));
  const lexicon = createLexicon({ manifest: JSON.parse(await readFile(path.join(dataDir, 'manifest.json'), 'utf8')), codes: lang.inventory.codes, script: lang.script,
    fetchFile: async (n) => JSON.parse(await readFile(path.join(dataDir, n), 'utf8')),
    fetchShard: async (n) => JSON.parse(await readFile(path.join(dataDir, 'forms', `${n}.json`), 'utf8')) });
  const head = (id) => bare(lemmas[id]?.headword ?? lemmas[id]?.dict_form ?? '');
  const rankOf = async (w) => {
    const ranks = [rankByHead.get(w.toLowerCase())];
    for (const a of [...await lexicon.lookup(w), ...(w !== w.toLowerCase() ? await lexicon.lookup(w.toLowerCase()) : [])]) {
      if (CLOSED.has(a.pos)) return 1;                       // function words are frequent whatever list files them
      ranks.push(rankByHead.get(head(a.lemma)));
    }
    const known = ranks.filter((r) => r != null);
    return known.length ? Math.min(...known) : null;
  };
  const names = Object.values(course.cast ?? {}).map((c) => c.name ?? '');
  let warnings = 0;
  for (const u of course.units) {
    const r = await unitReport(u, rankOf, { names });
    if (r.warning) { console.log('warning:', r.warning); warnings += 1; }
    else if (r.rare.length) console.log(`${u.id}: rare (three or fewer, fine): ${r.rare.map((x) => x.words.join(' ')).join('; ')}`);
  }
  console.log(`${course.units.length} units, ${warnings} frequency warnings`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv[2]);
