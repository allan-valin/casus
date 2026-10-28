// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { canTranslate, looksLike, paraButtons } from '../../src/app/lib/paraTranslate.js';

// Allan, 2026-10-28: Learn pages taken from a French book kept French paragraphs; translate them one by one, in the
// browser (Bergamot, MPL-2.0 — not Google: his open-source rule)
describe('per-paragraph translation', () => {
  it('knows which pairs Bergamot can do (through English when needed)', () => {
    expect(canTranslate('fr', 'pt')).toBe(true);
    expect(canTranslate('en', 'de')).toBe(true);
    expect(canTranslate('fr', 'mk')).toBe(false);       // no Macedonian model
    expect(canTranslate('pt', 'pt')).toBe(false);
  });
  it('tells a paragraph still in the source language from a translated one', () => {
    expect(looksLike('Les verbes coréens sont toujours placés à la fin de la phrase.', 'fr', 'pt')).toBe(true);
    expect(looksLike('Os verbos coreanos são sempre colocados no final da frase.', 'fr', 'pt')).toBe(false);
  });
  it('adds a button to untranslated paragraphs; a click swaps in the translation, and back', async () => {
    const node = document.createElement('div');
    node.innerHTML = '<p>Les verbes <b>먹다</b> sont toujours à la fin de la phrase.</p><p>Os verbos ficam no fim da frase.</p>';
    const calls = [];
    paraButtons(node, { src: 'fr', ui: 'pt', translate: async (html, from, to) => { calls.push([from, to]); return html.replace('Les verbes', 'Os verbos').replace('sont toujours à la fin de la phrase', 'ficam sempre no fim da frase'); },
      labels: { button: 'traduzir', busy: 'traduzindo…', original: 'original', failed: 'falhou' } });
    await new Promise((r) => setTimeout(r, 0));
    const buttons = node.querySelectorAll('button.para-tr');
    expect(buttons.length).toBe(1);
    buttons[0].click();
    await new Promise((r) => setTimeout(r, 10));
    const p = node.querySelector('p');
    expect(p.textContent).toContain('ficam sempre no fim da frase');
    expect(p.querySelector('b').textContent).toBe('먹다');
    expect(calls).toEqual([['fr', 'pt']]);
    p.querySelector('button.para-tr').click();
    await new Promise((r) => setTimeout(r, 10));
    expect(node.querySelector('p').textContent).toContain('sont toujours');
  });
});
