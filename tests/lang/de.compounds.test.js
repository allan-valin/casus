// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { compoundStage } from '../../src/lang/de/compounds.js';
import Block from '../../src/app/components/Block.svelte';

const block = (surface, lemma) => ({ token: { index: 0, surface, key: surface }, candidates: [{ analysis: { lemma, pos: 'noun', case: 'nom', number: 'sg', gender: 'f' }, reasons: [], links: [] }], pinned: null, resolved: true });

describe('compound roots (Allan, 2026-10-18)', () => {
  it('splits a noun by its lemma’s root lengths, the inflected ending staying with the last root', () => {
    const [b] = compoundStage([block('Muttersprachen', '7')], { compounds: { 7: [6, 7] } });
    expect(b.parts).toEqual(['Mutter', 'sprachen']);
  });
  it('leaves a word alone when its lemma has no split or the surface is too short', () => {
    expect(compoundStage([block('Haus', '8')], { compounds: { 7: [6, 7] } })[0].parts).toBe(undefined);
    expect(compoundStage([block('Mut', '7')], { compounds: { 7: [6, 7] } })[0].parts).toBe(undefined);
  });
  it('the pill draws each root in its own ink', () => {
    const b = { ...block('Muttersprache', '7'), parts: ['Mutter', 'sprache'] };
    const { container } = render(Block, { block: b, layers: { nominal: true, verb: true, function: true, classes: false }, onhover: () => {}, onopen: () => {} });
    const roots = [...container.querySelectorAll('.surface .root')];
    expect(roots.map((r) => r.textContent)).toEqual(['Mutter', 'sprache']);
    expect(roots[0].className).not.toBe(roots[1].className);
  });
});
