import { describe, it, expect } from 'vitest';
import { parseItems } from '../../src/app/lib/parse.js';
import { getLanguage } from '../../src/lang/registry.js';

/* Parse the form (drills research 2026-10-20, item 2): a form, choose what it is; a form with several readings
 * (rosae: genitive or dative singular, nominative or vocative plural) never offers another of its own readings as
 * a wrong answer. */
const la = getLanguage('la');
const rosa = { id: '1', headword: 'rosa', pos: 'noun', rows: [['rosa', 'nnsf', 'nvsf', 'nbsf'], [4, 'e', 'ngsf', 'ndsf', 'nnpf', 'nvpf'], [4, 'm', 'nasf']] };
const label = (table, row, col) => `${row} ${col}`;

describe('parseItems', () => {
  it('one item per form, its label the answer', () => {
    const items = parseItems(rosa, la, label);
    expect(items.map((i) => i.prompt).sort()).toEqual(['rosa', 'rosae', 'rosam']);
    expect(items.find((i) => i.prompt === 'rosam').answer).toBe('acc sg');
  });
  it('the other readings of a syncretic form are neither the answer nor among the wrong answers', () => {
    const rosae = parseItems(rosa, la, label).find((i) => i.prompt === 'rosae');
    const readings = ['gen sg', 'dat sg', 'nom pl', 'voc pl'];
    expect(readings).toContain(rosae.answer);
    for (const r of readings) if (r !== rosae.answer) expect(rosae.pool).not.toContain(r);
    expect(rosae.pool).toContain('acc sg');
    expect(rosae.accept.sort()).toEqual([...readings].sort());
  });
});

import { transformItems } from '../../src/app/lib/parse.js';

describe('transformItems (drills research item 3: one-step transformation)', () => {
  const amo = { id: '2', headword: 'amo', pos: 'verb', rows: [['amo', 'v1spia1'], [2, 'as', 'v2spia1'], [2, 'at', 'v3spia1'], [2, 'amus', 'v1ppia1'], [2, 'atis', 'v2ppia1'], [2, 'ant', 'v3ppia1']] };
  it('pairs cells that differ in one feature: the change is named, the other form is the answer', () => {
    const items = transformItems(amo, la, (f) => f);
    const toPlural = items.find((i) => i.from === 'amo' && i.change === 'pl');
    expect(toPlural.answer).toBe('amamus');
    expect(items.some((i) => i.from === 'amas' && i.change === '1' && i.answer === 'amo')).toBe(true);
    expect(items.every((i) => i.prompt.includes(i.from))).toBe(true);
  });
  it('a form shared by two cells is not asked (the change would be ambiguous)', () => {
    const items = transformItems(rosa, la, (f) => f);
    expect(items.some((i) => i.from === 'rosae')).toBe(false);
  });
});
