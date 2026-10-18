import { describe, it, expect } from 'vitest';
import { frontDecode, paradigmGroups } from '../../src/app/lib/paradigm.js';
import { getLanguage } from '../../src/lang/registry.js';

const la = getLanguage('la');
const de = getLanguage('de');

describe('frontDecode', () => {
  it('mirrors tools/build_paradigms.py front coding', () => {
    expect(frontDecode([['rosa', 'nnsf'], [4, 'e', 'ngsf', 'ndsf'], [4, 'm', 'nasf'], [0, 'urbs', 'x']]))
      .toEqual([['rosa', 'nnsf'], ['rosae', 'ngsf', 'ndsf'], ['rosam', 'nasf'], ['urbs', 'x']]);
  });
});

describe('paradigmGroups', () => {
  it('a noun: one table, cases as rows in the inventory order, numbers as columns', () => {
    const rows = [['rosa', 'nnsf', 'nbsf', 'nvsf'], ['rosae', 'ngsf', 'ndsf', 'nnpf', 'nvpf'], ['rosam', 'nasf'], ['rosarum', 'ngpf'], ['rosis', 'ndpf', 'nbpf'], ['rosas', 'napf']];
    const [g] = paradigmGroups(rows, '33803', la);
    expect(g.kind).toBe('table');
    expect(g.rows).toEqual(['nom', 'voc', 'gen', 'dat', 'acc', 'abl']);
    expect(g.cols).toEqual(['sg', 'pl']);
    expect(g.cell('abl', 'sg').map((x) => x.form)).toEqual(['rosa']);
    expect(g.cell('dat', 'pl').map((x) => x.form)).toEqual(['rosis']);
  });
  it('a German adjective: one table per declension type and gender column groups', () => {
    const rows = [['gutem', 'adsmsp', 'adsnsp'], ['guten', 'adsmwp', 'adsnwp', 'adpxwp'], ['guter', 'ansmsp', 'adsfsp']];
    const groups = paradigmGroups(rows, '1', de);
    expect(groups.map((g) => g.label)).toEqual(expect.arrayContaining(['strong · pos', 'weak · pos']));
    const strong = groups.find((g) => g.label === 'strong · pos');
    expect(strong.cols).toEqual(['m', 'f', 'n']);
    expect(strong.rowsBy).toBe('case');
    expect(strong.cell('dat', 'm').map((x) => x.form)).toEqual(['gutem']);
  });
  it('a verb: finite forms by mood and tense (persons × numbers), non-finite forms as a list', () => {
    const rows = [['ging', 'v1sri', 'v3sri'], ['gingen', 'v1pri', 'v3pri'], ['gingst', 'v2sri'], ['gegangen', 'v0xxb'], ['gehen', 'v0xxn', 'v1ppi']];
    const groups = paradigmGroups(rows, '7', de);
    const pret = groups.find((g) => g.label === 'pret · ind');
    expect(pret.rows).toEqual(['1', '2', '3']);
    expect(pret.cols).toEqual(['sg', 'pl']);
    expect(pret.cell('3', 'sg').map((x) => x.form)).toEqual(['ging']);
    const nonfinite = groups.find((g) => g.kind === 'list');
    expect(nonfinite.items.map((x) => `${x.label}: ${x.form}`)).toEqual(expect.arrayContaining(['ppl2: gegangen', 'inf: gehen']));
  });
});
