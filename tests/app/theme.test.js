import { describe, it, expect } from 'vitest';
import { themesFor, pickTheme, themeVars, MODE_KEY, themeKey, flagUrl } from '../../src/app/lib/theme.js';
import { LANGUAGES } from '../../src/lang/registry.js';

const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

describe('colour themes from flags (Allan, 2026-10-20)', () => {
  it('every language has at least one flag theme, and the Casus purple is always offered last', () => {
    for (const l of LANGUAGES) {
      const th = themesFor(l.code);
      expect(th.length, l.code).toBeGreaterThanOrEqual(2);
      expect(th.at(-1).id).toBe('casus');
      for (const x of th) expect(x.accent, `${l.code} ${x.id}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
  it('a language with several countries offers each (Portuguese: Brazil and Portugal; Spanish: Spain and Mexico…)', () => {
    expect(themesFor('pt').map((x) => x.id).slice(0, 2)).toEqual(['br', 'pt']);
    expect(themesFor('es').map((x) => x.id)).toEqual(expect.arrayContaining(['es', 'mx', 'ar']));
  });
  it('the chosen theme is kept per language; the default is the first flag', () => {
    const s = store();
    expect(pickTheme('pt', s).id).toBe('br');
    s.setItem(themeKey('pt'), 'pt');
    expect(pickTheme('pt', s).id).toBe('pt');
    s.setItem(themeKey('pt'), 'nonsense');
    expect(pickTheme('pt', s).id).toBe('br');
    expect(MODE_KEY).toBe('casus:mode');
  });
  it('theme variables: the accent, a second colour and readable text on the accent', () => {
    const v = themeVars(themesFor('ja')[0]);
    expect(v['--accent']).toBe(themesFor('ja')[0].accent);
    expect(v['--accent-ink']).toMatch(/^#/);
    expect(v['--accent-2']).toMatch(/^#/);
  });
  it('Latin flies the Roman vexillum (red, golden eagle, SPQR), not Italy; Ancient Greek its city emblems, not the modern flag first', () => {
    expect(themesFor('la')[0].id).toBe('spqr');
    expect(themesFor('la').map((x) => x.id)).not.toContain('it');
    expect(themesFor('grc')[0].id).toBe('athens');
    expect(themesFor('grc').map((x) => x.id)).toContain('sparta');
    for (const id of ['spqr', 'athens', 'sparta']) expect(flagUrl(id), id).toBeTruthy();
  });
  it('the themes of one language look clearly different, not shades of one colour (Allan, 2026-10-27: German all red)', () => {
    const hue = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      if (d < 0.15) return null;                                  // grey or black: no hue
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const gap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    for (const l of LANGUAGES) {
      const hs = themesFor(l.code).map((x) => hue(x.accent)).filter((h) => h !== null);
      for (let i = 0; i < hs.length; i += 1) for (let j = i + 1; j < hs.length; j += 1) expect(gap(hs[i], hs[j]), `${l.code}: ${themesFor(l.code).map((x) => x.id + x.accent)}`).toBeGreaterThanOrEqual(40);
    }
    expect(themesFor('de')[0].accent).toBe('#c00000');            // the first flag keeps its own colour
  });
});
