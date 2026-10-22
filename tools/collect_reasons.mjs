#!/usr/bin/env node
/* Every reason the parsers give on the sample texts of every language (for the translation table of reasons,
 * src/app/lib/i18n.reasons.js): node tools/collect_reasons.mjs [chars per sample] > reasons.json */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLexicon } from '../src/lib/lexicon.js';
import { createState } from '../src/lib/state.js';
import { LANGUAGES, getLanguage } from '../src/lang/registry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const limit = Number(process.argv[2] ?? 4000);
const out = {};
for (const { code } of LANGUAGES) {
  const lang = getLanguage(code);
  const dataDir = path.join(ROOT, 'data', lang.code);
  const sampleDir = path.join(ROOT, 'public', 'samples', lang.code);
  let manifest, files;
  try { manifest = JSON.parse(await readFile(path.join(dataDir, 'manifest.json'), 'utf8')); files = (await readdir(sampleDir)).filter((f) => f.endsWith('.txt')); } catch { continue; }
  const lexicon = createLexicon({ manifest, codes: lang.inventory.codes, script: lang.script,
    fetchFile: async (name) => JSON.parse(await readFile(path.join(dataDir, name), 'utf8')),
    fetchShard: async (name) => JSON.parse(await readFile(path.join(dataDir, 'forms', `${name}.json`), 'utf8')) });
  for (const f of files) {
    const text = (await readFile(path.join(sampleDir, f), 'utf8')).slice(0, limit);
    try {
      const state = createState({ text, lexicon, lang });
      await state.load();
      state.sentences().forEach((_, i) => {
        state.select(i);
        for (const b of state.blocks()) for (const c of b.candidates) for (const r of c.reasons) (out[r] ??= new Set()).add(lang.code);
      });
    } catch (e) { console.error(lang.code, f, e.message); }
  }
  console.error(lang.code, Object.keys(out).length);
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(out).map(([r, s]) => [r, [...s]])), null, 0));
