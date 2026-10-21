#!/usr/bin/env node
/*
 * Runs Casus's proofreader (src/lib/proof: Hunspell spelling, LanguageTool grammar — the local server first, see
 * tools/languagetool.sh) over files, line by line, keeping only the lines written in the language's script, and prints
 * file:line, the issue and its suggestions. For AI-written text instead of a native review (Allan, 2026-10-21: "use
 * our proofreader to double check how grammatical the sentences are").
 *
 *   node tools/proof_files.mjs mk tools/curricula/*\/i18n/mk.A.yml docs/conversation/GUIDE.mk.md
 */
import { readFileSync } from 'node:fs';
import { DICTIONARIES, makeSpeller, spellIssues } from '../src/lib/proof/spell.js';
import { checkGrammar, LT_CODE } from '../src/lib/proof/grammar.js';

const [code, ...files] = process.argv.slice(2);
const SCRIPT = { mk: /\p{Script=Cyrillic}/u, ar: /\p{Script=Arabic}/u, de: /[A-Za-zÄÖÜäöüß]/, pt: /[A-Za-zÀ-ú]/ }[code];
if (!SCRIPT || !files.length) { console.error('usage: proof_files.mjs <mk|ar|de|pt> files…'); process.exit(2); }

async function speller() {
  const d = DICTIONARIES[code];
  if (!d) return null;
  const base = `https://cdn.jsdelivr.net/npm/${d[0]}@${d[1]}`;
  const [aff, dic] = await Promise.all(['index.aff', 'index.dic'].map((f) => fetch(`${base}/${f}`).then((r) => r.text())));
  return makeSpeller(aff, dic);
}

// the part of a line that is prose in the language: drop YAML keys, markdown marks, code and the other script's words
function prose(line) {
  let s = line.replace(/^\s*[-\w"'.]+:\s*(\|)?\s*/, '').replace(/^\s*-\s+/, '').replace(/[*_`#>|]/g, '').replace(/^["']|["'],?$/g, '');
  return s.trim();
}

const sp = await speller();
let total = 0;
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (const [n, raw] of lines.entries()) {
    if (!SCRIPT.test(raw) || raw.trimStart().startsWith('#')) continue;
    const text = prose(raw);
    if (!text) continue;
    const found = [];
    if (sp) for (const i of spellIssues(text, sp, { suggest: true })) if (SCRIPT.test(i.word)) found.push(`spelling «${i.word}» → ${i.replacements.slice(0, 3).join(', ') || '?'}`);
    if (LT_CODE[code]) {
      const g = await checkGrammar(text, code, { fetchImpl: fetch, allowPublic: false, localMs: 60000 });
      for (const i of g.issues) found.push(`${i.kind}: «${text.slice(i.offset, i.offset + i.length)}» ${i.message} → ${i.replacements.slice(0, 3).join(', ') || '?'}`);
    }
    for (const f of found) console.log(`${file}:${n + 1}: ${f}`);
    total += found.length;
  }
}
console.error(`${total} issues`);
