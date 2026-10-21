// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import LanguageBar from '../../src/app/components/LanguageBar.svelte';

/* Allan, 2026-10-19: the drills link sits on its own row under the languages, and on the drills page a language
 * name opens that language's drills (he kept clicking them to switch drills). */
describe('LanguageBar', () => {
  it('reader: languages lead to their readers; a second row offers Reader and Drills', () => {
    const { container } = render(LanguageBar, { current: 'grc', view: 'reader' });
    const langs = [...container.querySelectorAll('nav.languages a')];
    expect(langs.find((a) => a.textContent.includes('Latin')).getAttribute('href')).toMatch(/\/$/);
    expect(langs.some((a) => /drills/i.test(a.textContent))).toBe(false);
    const views = [...container.querySelectorAll('nav.views a')];
    expect(views.map((a) => a.dataset.view)).toEqual(['reader', 'drills', 'learn', 'talk', 'speak', 'proof']);   // learn, proofreading added 2026-10-19; pronunciation 2026-10-20; conversation 2026-10-21
    expect(views[5].getAttribute('href')).toMatch(/\/grc\/proof\/$/);
    expect(views[3].getAttribute('href')).toMatch(/\/grc\/talk\/$/);
    expect(views[1].getAttribute('href')).toMatch(/\/grc\/drills\/$/);
    expect(views[4].getAttribute('href')).toMatch(/\/grc\/speak\/$/);
    expect(container.querySelector('nav.views a[aria-current=page]').dataset.view).toBe('reader');
  });
  it('drills: a language name opens its drills, and the current language stays marked', () => {
    const { container } = render(LanguageBar, { current: 'grc', view: 'drills' });
    const langs = [...container.querySelectorAll('nav.languages a')];
    expect(langs.find((a) => a.textContent.includes('German')).getAttribute('href')).toMatch(/\/de\/drills\/$/);
    expect(langs.find((a) => a.textContent.includes('Latin')).getAttribute('href')).toMatch(/\/drills\/$/);
    expect(container.querySelector('nav.languages a[aria-current=page]').textContent).toMatch(/Greek/);
    expect(container.querySelector('nav.views a[aria-current=page]').dataset.view).toBe('drills');
  });
  it('each language carries its flag, and the three sites are distinct buttons with their own mark (Allan, 2026-10-20)', () => {
    const { container } = render(LanguageBar, { current: 'grc', view: 'reader' });
    const latin = [...container.querySelectorAll('nav.languages a')].find((a) => a.textContent.includes('Latin'));
    expect(latin.querySelector('img.flag')).not.toBe(null);
    const sites = [...container.querySelectorAll('nav.sites .site')];
    expect(sites.map((x) => x.dataset.site)).toEqual(['casus', 'asia', 'world']);
    expect(sites.every((x) => x.querySelector('.site-mark'))).toBe(true);
    expect(container.querySelector('nav.sites .site.here').dataset.site).toBe('casus');
  });
});
