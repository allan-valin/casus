#!/usr/bin/env node
/*
 * CLI harness: node tools/parse_cli.mjs "<latin text>"
 * Prints one line per block — index, surface, and either the resolved
 * analysis or every surviving candidate with the reason it survived. Reads
 * data/manifest.json and data/forms/<shard>.json from disk; this is the
 * output the UI plan renders as blocks.
 */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createLexicon } from '../src/lib/lexicon.js';
import { createState } from '../src/lib/state.js';

const ORDER = ['case', 'number', 'gender', 'degree', 'person', 'tense', 'mood', 'voice', 'governs'];

function describe(analysis) {
  const parts = ORDER.filter((k) => analysis[k] != null && analysis[k] !== 'x')
    .map((k) => (Array.isArray(analysis[k]) ? analysis[k].join('/') : analysis[k]));
  if (analysis.pos === 'verb') {
    const { person, number, tense, mood, voice } = analysis;
    return ['verb', person, number, tense, mood, voice].join(' ');
  }
  return [analysis.pos, ...parts].join(' ');
}

function headword(analysis, lemmas) {
  const record = lemmas?.[analysis.lemma];
  if (!record) return '';
  return ` <${record.dict_form ?? record.headword}>`;
}

/** Pure: blocks -> text. `lemmas` (optional) maps lemma id -> {headword, dict_form}. */
export function formatBlocks(blocks, lemmas = null) {
  const lines = [];
  for (const block of blocks) {
    const { token, candidates, pinned } = block;
    const mark = pinned ? '📌' : (candidates.length === 1 ? ' ' : (candidates.length ? '?' : '!'));
    if (candidates.length === 0) {
      lines.push(`${String(token.index).padStart(3)} ${mark} ${token.surface}  — not in lexicon`);
      continue;
    }
    lines.push(`${String(token.index).padStart(3)} ${mark} ${token.surface}`);
    for (const c of candidates) {
      lines.push(`       ${describe(c.analysis)}${headword(c.analysis, lemmas)}  [${c.reasons.join('; ')}]`);
    }
  }
  return lines.join('\n');
}

async function main(argv) {
  const text = argv.slice(2).join(' ').trim();
  if (!text) {
    console.error('usage: node tools/parse_cli.mjs "<latin text>"');
    return 2;
  }
  const dataDir = process.env.CASUS_DATA ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'data');
  const manifest = JSON.parse(await readFile(path.join(dataDir, 'manifest.json'), 'utf8'));
  const lemmas = JSON.parse(await readFile(path.join(dataDir, 'lemmas.json'), 'utf8'));
  const lexicon = createLexicon({
    manifest,
    fetchShard: async (name) => JSON.parse(await readFile(path.join(dataDir, 'forms', `${name}.json`), 'utf8')),
  });
  const state = createState({ text, lexicon });
  await state.load();
  state.sentences().forEach((sentence, i) => {
    state.select(i);
    console.log(`\n# ${sentence.text}`);
    console.log(formatBlocks(state.blocks(), lemmas));
  });
  console.error(`\n(${lexicon.loadedShards().length} shards read)`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv);
}
