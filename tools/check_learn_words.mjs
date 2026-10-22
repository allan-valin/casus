#!/usr/bin/env node
/*
 * Checks the language in lessons written for Casus against the reader's dictionary: every word of the examples, the
 * tables and the corrected sentences of "common mistakes" (never the mistakes themselves) must be a known form.
 * Prints the unknown ones with their lesson, for a person to look at — a name or a rare form can be fine.
 *
 * Usage: node tools/check_learn_words.mjs <code>
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = process.argv[2];
const { createLexicon } = await import('../src/lib/lexicon.js');
const { createState } = await import('../src/lib/state.js');
const { getLanguage } = await import('../src/lang/registry.js');
const lang = getLanguage(code);
const dataDir = path.join(ROOT, 'data', code);
const json = async (f) => JSON.parse(await readFile(path.join(dataDir, f), 'utf8'));
const lexicon = createLexicon({ manifest: await json('manifest.json'), codes: lang.inventory.codes, script: lang.script, fetchFile: json, fetchShard: (n) => json(`forms/${n}.json`) });
const SCRIPT = /[\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Greek}]/u;
const strip = (h) => h.replace(/<s>.*?<\/s>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
let unknown = 0;
for (const f of (await readdir(path.join(dataDir, 'learn'))).filter((x) => !x.startsWith('q-'))) {
  const l = await json(`learn/${f}`);
  if (l.source !== 'written for Casus') continue;
  const texts = [...l.examples.map((e) => e.text), ...l.sections.map((s) => strip(s.html.en ?? s.html)), strip(l.intro?.en ?? '')];
  const words = new Set(texts.join(' ').split(/[^\p{L}-]+/u).filter((w) => SCRIPT.test(w) && w.length > 1 && !w.startsWith('-') && !w.endsWith('-')));
  const missing = [];
  for (const w of words) {
    const st = createState({ text: w, lexicon, lang });
    await st.load();
    if (st.blocks().every((b) => !b.candidates.length)) missing.push(w);
  }
  if (missing.length) { unknown += missing.length; console.log(`${l.id}: ${missing.join(', ')}`); }
}
console.log(`${unknown} unknown words`);
