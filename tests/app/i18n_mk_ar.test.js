import { describe, it, expect } from 'vitest';
import { t, ui, setLang, STRINGS } from '../../src/app/lib/i18n.svelte.js';
import { uiDir } from '../../src/app/lib/i18n.svelte.js';

describe('Macedonian and Arabic interfaces (Allan, 2026-10-20)', () => {
  it('setLang switches the chrome; a missing key falls back to English', () => {
    setLang('mk'); expect(ui.lang).toBe('mk'); expect(t('nav.reader')).toBe('Читач');
    setLang('ar'); expect(ui.lang).toBe('ar'); expect(t('nav.learn')).toBe('تعلّم');
    expect(t('para.ja.te')).toBe(STRINGS.en['para.ja.te']);
    setLang('en');
  });
  it('Arabic turns the page right to left; the others stay left to right', () => {
    expect(uiDir('ar')).toBe('rtl'); expect(uiDir('mk')).toBe('ltr'); expect(uiDir('pt')).toBe('ltr');
  });
  it('every string keeps the English placeholders', () => {
    for (const code of ['mk', 'ar']) {
      for (const [k, v] of Object.entries(STRINGS[code])) {
        const want = (STRINGS.en[k] ?? '').match(/\{\w+\}/g)?.sort().join() ?? '';
        expect([code, k, v.match(/\{\w+\}/g)?.sort().join() ?? '']).toEqual([code, k, want]);
      }
    }
  });
});

describe('language names in German, Macedonian and Arabic', () => {
  it('every language has its name in de, mk and ar', async () => {
    const { LANGUAGES, getLanguage } = await import('../../src/lang/registry.js');
    for (const l of LANGUAGES) for (const k of ['de', 'mk', 'ar']) expect(l.name[k], `${l.code} ${k}`).toBeTruthy();
    expect(getLanguage('mk').name.mk).toBe('македонски');
    expect(getLanguage('la').name.en).toBe('Latin');
  });
});
