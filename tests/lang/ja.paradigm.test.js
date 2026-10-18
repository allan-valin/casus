import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { paradigmGroups } from '../../src/app/lib/paradigm.js';

const ja = getLanguage('ja');
describe('Japanese conjugation table', () => {
  it('rows by tense/form, columns plain · polite · negative · polite negative', () => {
    const rows = [['食べる', 'vd'], ['食べます', 'vm'], ['食べない', 'vn'], ['食べません', 'vN'], ['食べた', 'vp'], ['食べました', 'vP'],
      ['食べなかった', 'vq'], ['食べませんでした', 'vQ'], ['食べて', 'vt'], ['食べられる', 'vo', 'vr']];
    const [g] = paradigmGroups(rows, '1', ja);
    expect(g.kind).toBe('table');
    expect(g.cols).toEqual(['plain', 'polite', 'neg', 'politeneg']);
    expect(g.rows.slice(0, 3)).toEqual(['present', 'past', 'te']);
    expect(g.cell('past', 'polite').map((i) => i.form)).toEqual(['食べました']);
    expect(g.cell('pot', 'plain').map((i) => i.form)).toEqual(['食べられる']);
  });
});
