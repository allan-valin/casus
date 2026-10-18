import { describe, it, expect } from 'vitest';
import { makeColors, CASE_COLORS, blockStyle as latinBlockStyle, LEGEND as LATIN_LEGEND } from '../../src/app/lib/colors.js';
import { LATIN_INVENTORY } from '../../src/lang/la/inventory.js';

const ALL = { nominal: true, verb: true, function: true, classes: false };
const five = {
  primary: 'case',
  channels: {
    case: { values: ['nom', 'gen', 'dat', 'acc', 'voc'], badge: { nom: 'Nm', gen: 'Gn', dat: 'Dt', acc: 'Ac', voc: 'Vc' },
      name: { en: { nom: 'nominative', gen: 'genitive', dat: 'dative', acc: 'accusative', voc: 'vocative' }, pt: { nom: 'nominativo', gen: 'genitivo', dat: 'dativo', acc: 'acusativo', voc: 'vocativo' } },
      hueOrder: ['nom', 'gen', 'dat', 'acc', 'voc'] },
    number: { values: ['sg', 'du', 'pl'], border: { du: 'double', pl: 'dashed' }, name: { en: { sg: 'singular', du: 'dual', pl: 'plural' }, pt: { sg: 'singular', du: 'dual', pl: 'plural' } } },
  },
  families: { nominal: ['noun', 'adj'], verb: ['verb'], function: '*' },
};

describe('makeColors(inventory)', () => {
  it('assigns the six validated hues to a five-case inventory in order and leaves the sixth unused', () => {
    const c = makeColors(five);
    expect(Object.keys(c.COLORS)).toEqual(['nom', 'gen', 'dat', 'acc', 'voc']);
    expect(new Set(Object.values(c.COLORS)).size).toBe(5);
    expect(c.COLORS.nom).toBe(CASE_COLORS.nom);
  });
  it('gives a secondary channel value its border style and a legend row', () => {
    const c = makeColors(five);
    const s = c.blockStyle({ token: { index: 0, surface: 'x' }, candidates: [{ analysis: { pos: 'noun', case: 'gen', number: 'du' } }], pinned: null }, ALL);
    expect(s.borderStyle).toBe('double');
    expect(s.border).toBe(c.COLORS.gen);
    expect(s.badge).toBe('Gn');
    expect(c.LEGEND.map((r) => r.key)).toContain('du');
    expect(c.LEGEND.find((r) => r.key === 'du').label).toBe('dual');
  });
  it('reproduces Latin exactly from the Latin inventory', () => {
    const c = makeColors(LATIN_INVENTORY);
    expect(c.COLORS).toEqual(CASE_COLORS);
    const b = { token: { index: 0, surface: 'x' }, candidates: [{ analysis: { pos: 'noun', case: 'loc', number: 'sg' } }], pinned: null };
    expect(c.blockStyle(b, ALL)).toEqual(latinBlockStyle(b, ALL));
    expect(c.LEGEND.map((r) => r.key)).toEqual(LATIN_LEGEND.map((r) => r.key));
  });
  it('families come from the inventory: a part of speech outside nominal and verb is a function word', () => {
    const c = makeColors(five);
    expect(c.family({ pos: 'noun' })).toBe('nominal');
    expect(c.family({ pos: 'particle' })).toBe('function');
  });
});
