// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Block from '../../src/app/components/Block.svelte';

const block = { token: { index: 0, surface: 'كتب' }, pinned: null, candidates: [
  { analysis: { lemma: '7', pos: 'verb', person: '3', marked: 'كَتَبَ' }, reasons: [], links: [] },
  { analysis: { lemma: '7', pos: 'verb', person: '3', marked: 'كُتِبَ' }, reasons: [], links: [] },
  { analysis: { lemma: '9', pos: 'noun', marked: 'كُتُب' }, reasons: [], links: [] }] };
const layers = { cases: true, classes: false };
const lemmaOf = (id) => ({ 7: { headword: 'كَتَبَ' }, 9: { headword: 'كِتَاب' } })[id];

describe('Block', () => {
  it('a language that asks for it shows the first reading’s dictionary form, not every spelling (Arabic)', () => {
    const { container } = render(Block, { block, layers, onhover: () => {}, onopen: () => {}, lemmaOf, lemmaOnTop: true });
    expect(container.querySelector('.reading').textContent).toBe('كَتَبَ');
  });
  it('otherwise the supplied spellings', () => {
    const { container } = render(Block, { block, layers, onhover: () => {}, onopen: () => {}, lemmaOf });
    expect(container.querySelector('.reading').textContent).toContain('/');
  });
});
