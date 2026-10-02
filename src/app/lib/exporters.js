import { describeAnalysis } from './colors.js';

/* Export (spec §9): the state as JSON, and a Markdown rendering for reading elsewhere. */

export function toJSON(reader) {
  return JSON.stringify({ version: 1, exported: new Date().toISOString(), ...reader.toJSON() }, null, 2);
}

function line(block) {
  const readings = block.candidates.map((c) => describeAnalysis(c.analysis)).join(' / ') || 'not in lexicon';
  const mark = block.pinned ? ' (pinned)' : block.candidates.length > 1 ? ' (?)' : '';
  return `- ${block.token.surface} — ${readings}${mark}`;
}

export function toMarkdown(reader) {
  const keep = reader.selected;
  const out = [`# Casus — ${new Date().toISOString().slice(0, 10)}`, ''];
  reader.sentences.forEach((sentence, i) => {
    reader.select(i);
    const byIndex = new Map(reader.blocks.map((b) => [b.token.index, b]));
    out.push(`## ${i + 1}. ${sentence.text}`, '');
    for (const index of reader.order) out.push(line(byIndex.get(index)));
    out.push('');
  });
  reader.select(keep);
  return out.join('\n');
}
