// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { getLanguage } from '../../src/lang/registry.js';
import Game from '../../src/app/components/Game.svelte';

const ja = getLanguage('ja');
describe('kana drill (Allan: like kana-quiz, sound first, all rows, grid)', () => {
  it('hiragana rows, katakana rows as the second group, the 46 basic kana each', () => {
    const { ROWS, LETTERS } = ja.game;
    expect(LETTERS.filter((l) => !l.extra)).toHaveLength(46);
    expect(ROWS.filter((r) => !r.capital).flatMap((r) => r.items).some((i) => i.glyph === 'あ')).toBe(true);
    expect(ROWS.filter((r) => r.capital).flatMap((r) => r.items).some((i) => i.glyph === 'ア')).toBe(true);
  });
  it('accepts the usual spellings (shi or si, tsu or tu, n or nn)', () => {
    const g = ja.game.createGrid({ rows: ja.game.ROWS.map((r) => r.id), shuffle: false });
    const at = (glyph) => g.cells.findIndex((c) => c.glyph === glyph);
    expect(g.check(at('し'), 'si').correct).toBe(true);
    expect(g.check(at('ツ'), 'tsu').correct).toBe(true);
    expect(g.check(at('ん'), 'nn').correct).toBe(true);
    expect(g.check(at('が'), 'ga').correct).toBe(true);
  });
  it('kana have no names: only "the sound" is offered', () => {
    const { container } = render(Game, { lang: ja, random: () => 0.5 });
    expect([...container.querySelectorAll('.modes input[name=answer]')].map((m) => m.value)).toEqual(['sound']);
  });
});
