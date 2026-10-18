// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TextPane from '../../src/app/components/TextPane.svelte';
import Block from '../../src/app/components/Block.svelte';
import { createReader } from '../../src/app/stores/reader.svelte.js';

const lexicon = {
  lookupAll: async (keys) => new Map(keys.map((k) => [k, k === 'xyzzy' ? [] : [
    { lemma: `${k}:noun:1`, pos: 'noun', case: 'nom', number: 'sg', gender: 'f' },
    { lemma: `${k}:noun:1`, pos: 'noun', case: 'abl', number: 'sg', gender: 'f' },
  ]])),
};
const ALL = { nominal: true, verb: true, function: true, classes: false };

describe('TextPane', () => {
  it('renders every sentence and dims the ones not selected', async () => {
    const reader = createReader({ lexicon, text: 'Rosa bona. Urbs magna.' });
    await reader.load();
    const { container } = render(TextPane, { reader, hovered: null });
    const sentences = container.querySelectorAll('.sentence');
    expect(sentences).toHaveLength(2);
    expect(sentences[1].classList.contains('dimmed')).toBe(true);
    await fireEvent.click(sentences[1]);
    expect(reader.selected).toBe(1);
  });

  it('highlights the hovered word of the selected sentence and keeps its punctuation', async () => {
    const reader = createReader({ lexicon, text: 'Rosa, bona.' });
    await reader.load();
    const { container } = render(TextPane, { reader, hovered: 2, partners: new Set([0]) });
    const hot = container.querySelector('.hot');
    expect(hot.textContent).toBe('bona');
    // the hovered word's agreement partners light up too, more softly (Allan, 2026-10-18)
    expect(container.querySelector('.hot-partner').textContent).toBe('Rosa');
    expect(container.querySelector('.sentence').textContent.replace(/\s+/g, ' ').trim()).toBe('Rosa, bona.');
  });
});

describe('Block', () => {
  const block = (cands, extra = {}) => ({ token: { index: 2, surface: 'rosa' }, candidates: cands, pinned: null, resolved: cands.length === 1, ...extra });
  const cand = (c) => ({ analysis: { lemma: '1', pos: 'noun', case: c, number: 'sg', gender: 'f' }, reasons: [] });

  it('shows the surface, the superscript index and the badge', () => {
    const { container } = render(Block, { block: block([cand('acc')]), layers: ALL, onhover: () => {}, onopen: () => {} });
    expect(container.textContent).toContain('rosa');
    expect(container.querySelector('.index').textContent).toBe('3');
    expect(container.querySelector('.badge').textContent).toBe('Ac');
    expect(container.querySelector('.pill').classList.contains('striped')).toBe(false);
  });

  it('marks an ambiguous block white with dots, and a pinned one', () => {
    const b = block([cand('nom'), cand('abl')], { pinned: { pos: 'noun', case: 'nom' } });
    const { container } = render(Block, { block: b, layers: ALL, onhover: () => {}, onopen: () => {} });
    const pill = container.querySelector('.pill');
    expect(pill.classList.contains('ambiguous')).toBe(true);
    expect(container.querySelectorAll('.dot')).toHaveLength(2);
    expect(pill.classList.contains('pinned')).toBe(true);
    expect(container.querySelector('.badge').textContent).toBe('?');
  });

  it('renders an unknown word as unknown and still opens', async () => {
    const onopen = vi.fn();
    const { container } = render(Block, { block: block([]), layers: ALL, onhover: () => {}, onopen });
    const pill = container.querySelector('.pill');
    expect(pill.classList.contains('unknown')).toBe(true);
    expect(container.querySelector('.badge').textContent).toBe('!');
    await fireEvent.click(pill);
    expect(onopen).toHaveBeenCalledTimes(1);
  });

  it('reports hover with its token index and null on leave', async () => {
    const onhover = vi.fn();
    const { container } = render(Block, { block: block([cand('nom')]), layers: ALL, onhover, onopen: () => {} });
    const pill = container.querySelector('.pill');
    await fireEvent.mouseEnter(pill);
    await fireEvent.mouseLeave(pill);
    expect(onhover.mock.calls).toEqual([[2], [null]]);
  });
});

describe('Block class sub-layer', () => {
  const ALL = { nominal: true, verb: true, function: true, classes: false };
  const b = { token: { index: 0, surface: 'rosa' }, pinned: null, resolved: true,
    candidates: [{ analysis: { lemma: '1', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' }, reasons: [] }] };
  it('shows the class badge only when that layer is on', () => {
    const off = render(Block, { block: b, layers: ALL, onhover: () => {}, onopen: () => {} });
    expect(off.container.querySelector('.class')).toBe(null);
    const on = render(Block, { block: b, layers: { ...ALL, classes: true }, lemmaOf: () => ({ pos: 'noun', decl: 1, gender: 'f' }), onhover: () => {}, onopen: () => {} });
    expect(on.container.querySelector('.class').textContent).toBe('1 f');
  });
});

describe('Block as a drag handle', () => {
  const ALL = { nominal: true, verb: true, function: true, classes: false };
  const b = { token: { index: 0, surface: 'rosa' }, pinned: null, resolved: true,
    candidates: [{ analysis: { lemma: '1', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' }, reasons: [] }] };
  it('is not a form control (a button would swallow the pool\'s pointerdown)', () => {
    const { container } = render(Block, { block: b, layers: ALL, onhover: () => {}, onopen: () => {} });
    const pill = container.querySelector('.pill');
    expect(pill.tagName).not.toBe('BUTTON');
    expect('value' in pill).toBe(false);
    expect(pill.getAttribute('role')).toBe('button');
    expect(pill.getAttribute('tabindex')).toBe('0');
  });
  it('opens on Enter and on Space from the keyboard', async () => {
    const onopen = vi.fn();
    const { container } = render(Block, { block: b, layers: ALL, onhover: () => {}, onopen });
    const pill = container.querySelector('.pill');
    await fireEvent.keyDown(pill, { key: 'Enter' });
    await fireEvent.keyDown(pill, { key: ' ' });
    expect(onopen).toHaveBeenCalledTimes(2);
  });
});

describe('keyboard access', () => {
  it('selects a sentence with Space as well as Enter', async () => {
    const reader = createReader({ lexicon, text: 'Rosa bona. Urbs magna.' });
    await reader.load();
    const { container } = render(TextPane, { reader, hovered: null });
    await fireEvent.keyDown(container.querySelectorAll('.sentence')[1], { key: ' ' });
    expect(reader.selected).toBe(1);
  });
});

describe('Block class badge on an ambiguous one-lemma block', () => {
  const ALL = { nominal: true, verb: true, function: true, classes: true };
  it('shows the class when every candidate shares one lemma, even if the case is open', () => {
    const b = { token: { index: 0, surface: 'rosa' }, pinned: null, resolved: false,
      candidates: [
        { analysis: { lemma: '1', pos: 'noun', case: 'nom', number: 'sg', gender: 'f' }, reasons: [] },
        { analysis: { lemma: '1', pos: 'noun', case: 'abl', number: 'sg', gender: 'f' }, reasons: [] },
      ] };
    const { container } = render(Block, { block: b, layers: ALL, lemmaOf: () => ({ pos: 'noun', decl: 1, gender: 'f' }), onhover: () => {}, onopen: () => {} });
    expect(container.querySelector('.class').textContent).toBe('1 f');
  });
  it('shows nothing when the candidates come from different lemmas', () => {
    const b = { token: { index: 0, surface: 'est' }, pinned: null, resolved: false,
      candidates: [
        { analysis: { lemma: '1', pos: 'verb', person: '3', number: 'sg', tense: 'pres', mood: 'ind', voice: 'act' }, reasons: [] },
        { analysis: { lemma: '2', pos: 'verb', person: '3', number: 'sg', tense: 'pres', mood: 'ind', voice: 'act' }, reasons: [] },
      ] };
    const { container } = render(Block, { block: b, layers: ALL, lemmaOf: () => ({ pos: 'verb', conj: '5' }), onhover: () => {}, onopen: () => {} });
    expect(container.querySelector('.class')).toBe(null);
  });
});

describe('Marks supplied by the dictionary (Allan, 2026-10-18)', () => {
  const cand = (marked) => ({ analysis: { lemma: '1', pos: 'noun', case: 'gen', number: 'sg', gender: 'm', ...(marked ? { marked } : {}) }, reasons: [] });
  const blk = (surface, cands) => ({ token: { index: 0, surface }, candidates: cands, pinned: null, resolved: cands.length === 1 });
  it('shows the marked spelling above an unaccented word, labelled as supplied', () => {
    const { container } = render(Block, { block: blk('λογου', [cand('λόγου')]), layers: { ...ALL, marks: true }, onhover: () => {}, onopen: () => {} });
    const r = container.querySelector('.reading.supplied');
    expect(r.textContent).toBe('λόγου');
    expect(r.title).toMatch(/dictionary/i);
  });
  it('lists every distinct marked spelling when they differ', () => {
    const { container } = render(Block, { block: blk('λογου', [cand('λόγου'), cand('λογοῦ')]), layers: { ...ALL, marks: true }, onhover: () => {}, onopen: () => {} });
    expect(container.querySelector('.reading.supplied').textContent).toBe('λόγου / λογοῦ');
  });
  it('writes final sigma and caps a long list at three with a count', () => {
    const many = [cand('λόγοσ'), cand('ἕν'), cand('ἔν'), cand('ἐν'), cand('έν')];
    const { container } = render(Block, { block: blk('λογος', many), layers: { ...ALL, marks: true }, onhover: () => {}, onopen: () => {} });
    expect(container.querySelector('.reading.supplied').textContent).toBe('λόγος / ἕν / ἔν +2');
  });
  it('shows nothing when the input had its marks, or when the layer is off', () => {
    const a = render(Block, { block: blk('λόγου', [cand()]), layers: { ...ALL, marks: true }, onhover: () => {}, onopen: () => {} });
    expect(a.container.querySelector('.reading')).toBe(null);
    const b = render(Block, { block: blk('λογου', [cand('λόγου')]), layers: { ...ALL, marks: false }, onhover: () => {}, onopen: () => {} });
    expect(b.container.querySelector('.reading')).toBe(null);
  });
});

describe('German article on noun pills (languages phase 3 Task 5)', async () => {
  const { getLanguage } = await import('../../src/lang/registry.js');
  const { makeColors } = await import('../../src/app/lib/colors.js');
  const de = getLanguage('de');
  const colors = makeColors(de.inventory);
  const noun = (c, n, g) => ({ analysis: { lemma: '1', pos: 'noun', case: c, number: n, gender: g }, reasons: [] });
  const blk = (surface, cands) => ({ token: { index: 0, surface }, candidates: cands, pinned: null, resolved: cands.length === 1 });
  const show = (b) => render(Block, { block: b, layers: { ...ALL, marks: true }, onhover: () => {}, onopen: () => {}, colors, showArticle: true }).container;
  it('shows das over a neuter singular noun', () => {
    expect(show(blk('Haus', [noun('nom', 'sg', 'n'), noun('acc', 'sg', 'n')])).querySelector('.article').textContent).toBe('das');
  });
  it('shows die (Pl.) over a plural', () => {
    expect(show(blk('Häuser', [noun('nom', 'pl', 'n')])).querySelector('.article').textContent).toBe('die (Pl.)');
  });
  it('shows both when the gender is open', () => {
    expect(show(blk('See', [noun('nom', 'sg', 'm'), noun('nom', 'sg', 'f')])).querySelector('.article').textContent).toBe('der / die');
  });
  it('no article over a singular noun whose gender is unknown (review I2)', () => {
    expect(show(blk('Meter', [noun('nom', 'sg', 'x'), noun('acc', 'sg', 'x')])).querySelector('.article')).toBe(null);
  });
  it('no article when the word may be something other than a noun: sentence-initial Er, Ich (review I4)', () => {
    const er = blk('Er', [noun('nom', 'sg', 'm'), { analysis: { lemma: '9', pos: 'pron', case: 'nom', number: 'sg', gender: 'm' }, reasons: [] }]);
    expect(show(er).querySelector('.article')).toBe(null);
  });
  it('never on a Latin pill or a non-noun', () => {
    const latin = render(Block, { block: blk('rosa', [noun('nom', 'sg', 'f')]), layers: ALL, onhover: () => {}, onopen: () => {} }).container;
    expect(latin.querySelector('.article')).toBe(null);
    const adj = show(blk('gut', [{ analysis: { lemma: '2', pos: 'adj', case: 'x', number: 'x', gender: 'x' }, reasons: [] }]));
    expect(adj.querySelector('.article')).toBe(null);
  });
});

describe('Block shows the punctuation that follows its word', () => {
  it('a comma after the word is drawn after the pill, outside it', () => {
    const b = { token: { index: 0, surface: 'erwachte', trail: ',' }, candidates: [{ analysis: { lemma: '1', pos: 'verb', person: '3', number: 'sg', tense: 'pret', mood: 'ind' }, reasons: [] }], pinned: null, resolved: true };
    const { container } = render(Block, { block: b, layers: ALL, onhover: () => {}, onopen: () => {} });
    expect(container.querySelector('.trail').textContent).toBe(',');
    expect(container.querySelector('.pill').contains(container.querySelector('.trail'))).toBe(false);
  });
});
