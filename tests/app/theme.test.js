import { describe, it, expect } from 'vitest';
import { themesFor, pickTheme, themeVars, applyTheme, MODE_KEY, themeKey, flagUrl } from '../../src/app/lib/theme.js';
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
  // Allan, 2026-10-27 (second pass): colours from the flag's own logic, never random — the most prominent colour tints
  // the page, a white-dominant flag gives a white page with coloured text and outlined buttons
  const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  it('every accent reads on white (contrast 4.5 or more): bright flag colours are darkened', () => {
    for (const l of LANGUAGES) for (const th of themesFor(l.code)) expect(contrast(th.accent, '#ffffff'), `${l.code} ${th.id} ${th.accent}`).toBeGreaterThanOrEqual(4.5);
  });
  it('German: Germany gold page with red accent; Austria white page, red text, outlined; Switzerland red page, filled', () => {
    const [de, at, ch] = themesFor('de');
    expect([de.groundOf, de.fill]).toEqual(['#ffce00', 'solid']);
    expect(lum(de.accent) < 0.2 && parseInt(de.accent.slice(1, 3), 16) > parseInt(de.accent.slice(3, 5), 16) * 3).toBe(true);   // a red
    expect([at.groundOf, at.fill]).toEqual(['#ffffff', 'outline']);
    expect([ch.groundOf, ch.fill]).toEqual(['#d52b1e', 'solid']);
  });
  it('the themes of one language differ in page colour, accent or button style — never identical', () => {
    const hue = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 0.15) return 'none'; const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return Math.round(((h * 60 + 360) % 360) / 30) % 12; };
    for (const l of LANGUAGES) {
      const sig = themesFor(l.code).map((x) => `${hue(x.groundOf)}|${hue(x.accent)}|${x.fill}`);
      expect(new Set(sig).size, `${l.code}: ${sig}`).toBe(sig.length);
    }
  });
  it('theme variables carry the page ground and the button style', () => {
    const v = themeVars(themesFor('de')[1]);
    expect(v['--ground']).toBe('#ffffff');
    expect(v['--ground-amt']).toBe('0%');
    const root = { dataset: {}, style: { setProperty: () => {} } };
    applyTheme('light', themesFor('de')[1], root);
    expect(root.dataset.fill).toBe('outline');
  });
});
