import { describe, it, expect } from 'vitest';
import { t, ui, setLang, STRINGS } from '../../src/app/lib/i18n.svelte.js';

describe('German interface (2026-10-20)', () => {
  it('setLang("de") switches the chrome to German, falling back to English per key', () => {
    setLang('de');
    expect(ui.lang).toBe('de');
    expect(t('nav.reader')).toBe('Leser');
    expect(t('learn.score', { pct: 50, n: 4 })).toBe('Bisher: 50 % richtig bei 4 Antworten');
    setLang('en');
  });
  it('every German string keeps the English placeholders', () => {
    for (const [k, v] of Object.entries(STRINGS.de)) {
      const want = (STRINGS.en[k] ?? '').match(/\{\w+\}/g)?.sort().join() ?? '';
      expect([k, v.match(/\{\w+\}/g)?.sort().join() ?? '']).toEqual([k, want]);
    }
  });
});
