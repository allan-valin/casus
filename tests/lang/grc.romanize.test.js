// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { romanizeGrc } from '../../src/lang/grc/romanize.js';
import { getLanguage } from '../../src/lang/registry.js';
import Block from '../../src/app/components/Block.svelte';

/* Allan, 2026-10-18: a romanised transliteration, smaller, below the word, for non-Latin scripts. */
describe('Greek romanisation (the usual scholarly scheme: η ē, ω ō, χ ch, rough breathing h, γγ ng)', () => {
  it.each([
    ['λόγος', 'logos'], ['ἀρχῇ', 'archēi'], ['ὁ', 'ho'], ['Ἐν', 'En'], ['θεόν', 'theon'], ['ἄγγελος', 'angelos'],
    ['ψυχή', 'psychē'], ['ῥήτωρ', 'rhētōr'], ['οὐρανός', 'ouranos'], ['εὐαγγέλιον', 'euangelion'], ['υἱός', 'huios'],
    ['Ἰωάννης', 'Iōannēs'], ['ἐγένετο', 'egeneto'], ['ἄνθρωπος', 'anthrōpos'], ['Ὅμηρος', 'Homēros'], ['ἀνάγκη', 'anankē'],
  ])('%s → %s', (g, r) => expect(romanizeGrc(g)).toBe(r));
  it('the Greek definition offers it', () => expect(getLanguage('grc').script.romanize('λόγος')).toBe('logos'));
  it('Latin and German have none', () => { expect(getLanguage('la').script?.romanize).toBeUndefined(); expect(getLanguage('de').script?.romanize).toBeUndefined(); });
});

describe('the block shows it under the word', () => {
  const block = { token: { index: 0, surface: 'λογος', key: 'λογος' }, candidates: [{ analysis: { lemma: '1', pos: 'noun', case: 'nom', number: 'sg', gender: 'm', marked: 'λόγος' }, reasons: [], links: [] }], pinned: null };
  const layers = { nominal: true, verb: true, function: true, classes: false, marks: true, roman: true };
  it('romanises the dictionary spelling when the input lacked marks', () => {
    const { container } = render(Block, { block, layers, onhover: () => {}, onopen: () => {}, romanize: romanizeGrc });
    expect(container.querySelector('.roman').textContent).toBe('logos');
  });
  it('the toggle hides it', () => {
    const { container } = render(Block, { block, layers: { ...layers, roman: false }, onhover: () => {}, onopen: () => {}, romanize: romanizeGrc });
    expect(container.querySelector('.roman')).toBe(null);
  });
});

describe('several dictionary spellings', () => {
  it('shows each distinct romanisation instead of picking one (ην: ēn / hēn)', () => {
    const c = (m) => ({ analysis: { lemma: m, pos: 'verb', marked: m }, reasons: [], links: [] });
    const block = { token: { index: 0, surface: 'ην', key: 'ην' }, candidates: [c('ἦν'), c('ἥν'), c('ἤν')], pinned: null };
    const { container } = render(Block, { block, layers: { nominal: true, verb: true, function: true, marks: true, roman: true }, onhover: () => {}, onopen: () => {}, romanize: romanizeGrc });
    expect(container.querySelector('.roman').textContent).toBe('ēn / hēn');
  });
});
