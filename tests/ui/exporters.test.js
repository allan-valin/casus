// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { toJSON, toMarkdown } from '../../src/app/lib/exporters.js';
import { createReader } from '../../src/app/stores/reader.svelte.js';

const lexicon = {
  lookupAll: async (keys) => new Map(keys.map((k) => [k, [
    { lemma: `${k}:noun:1`, pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
    { lemma: `${k}:noun:1`, pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
  ]])),
};

describe('exporters', () => {
  it('JSON carries the reader state, a version and a date', async () => {
    const reader = createReader({ lexicon, text: 'Rosa bona.' });
    await reader.load();
    const out = JSON.parse(toJSON(reader));
    expect(out.version).toBe(1);
    expect(out.text).toBe('Rosa bona.');
    expect(out.exported).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('Markdown lists every sentence in display order with readings and marks', async () => {
    const reader = createReader({ lexicon, text: 'Rosa bona. Urbs magna.' });
    await reader.load();
    reader.pin(0, reader.blocks[0].candidates[1].analysis);
    reader.move(1, 0);
    const md = toMarkdown(reader);
    expect(md).toContain('## 1. Rosa bona.');
    expect(md).toContain('## 2. Urbs magna.');
    const lines = md.split('\n');
    const first = lines.findIndex((l) => l.startsWith('- '));
    expect(lines[first]).toMatch(/^- bona — noun nom sg f \/ noun abl sg f \(\?\)$/);
    expect(lines[first + 1]).toMatch(/^- Rosa — noun abl sg f \(pinned\)$/);
    expect(reader.selected).toBe(0); // export restores the selection it found
  });
});
