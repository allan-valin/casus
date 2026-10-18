import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { drillTables, createEndingsGrid, sameAnswer } from '../../src/app/lib/endings.js';

/* Allan, 2026-10-18: grammar drills for noun and verb endings, the whole table visible, fill the gaps. */
const la = getLanguage('la');
const grc = getLanguage('grc');
const rosa = { id: '1', headword: 'rosa', pos: 'noun', rows: [['rosa', 'nnsf', 'nvsf', 'nbsf'], [4, 'e', 'ngsf', 'ndsf', 'nnpf', 'nvpf'], [4, 'm', 'nasf']] };

describe('endings drill', () => {
  it('turns a model word into its tables', () => {
    const [table] = drillTables(rosa, la);
    expect(table.rows).toContain('nom');
    expect(table.cols).toEqual(['sg', 'pl']);
  });
  it('one blank cell per filled table cell, checked against every form the cell allows', () => {
    const g = createEndingsGrid(drillTables(rosa, la)[0], la);
    const gen = g.cells.findIndex((c) => c.row === 'gen' && c.col === 'sg');
    expect(g.check(gen, 'rosa').ok).toBe(false);
    expect(g.check(gen, ' Rosae ').ok).toBe(true);
    expect(g.score).toMatchObject({ right: 1, firstTry: 0 });
    const acc = g.cells.findIndex((c) => c.row === 'acc' && c.col === 'sg');
    expect(g.check(acc, 'rosam').ok).toBe(true);
    expect(g.score.firstTry).toBe(1);
  });
  it('Greek: an answer without accents counts, and says which accents it lacked', () => {
    expect(sameAnswer('λογου', 'λόγου', grc)).toEqual({ ok: true, exact: false });
    expect(sameAnswer('λόγου', 'λόγου', grc)).toEqual({ ok: true, exact: true });
    expect(sameAnswer('λογω', 'λόγου', grc).ok).toBe(false);
  });
  it('reveal fills the rest and ends the round', () => {
    const g = createEndingsGrid(drillTables(rosa, la)[0], la);
    g.reveal();
    expect(g.score.done).toBe(true);
    expect(g.cells.every((c) => c.state === 'right' || c.state === 'revealed')).toBe(true);
  });
});
