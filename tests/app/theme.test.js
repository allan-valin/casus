import { describe, it, expect } from 'vitest';
import { themesFor, pickTheme, themeVars, MODE_KEY, themeKey } from '../../src/app/lib/theme.js';
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
});
