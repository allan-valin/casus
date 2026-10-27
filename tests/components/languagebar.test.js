// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
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
  it('on a phone the views fold into one button too (Allan, 2026-10-22): the same links, the current one on the button', () => {
    const { container } = render(LanguageBar, { current: 'grc', view: 'learn', parts: ['viewfold'] });
    const picker = container.querySelector('details.view-picker');
    expect(picker).not.toBe(null);
    expect(picker.querySelector('summary').textContent).toMatch(/Learn/);
    expect([...picker.querySelectorAll('a')].map((a) => a.dataset.view)).toEqual(['reader', 'drills', 'learn', 'talk', 'speak', 'proof']);
  });
  it('the language list shows every language of all three sites, by family, the current family open (Allan, 2026-10-22)', () => {
    const { container } = render(LanguageBar, { current: 'grc', view: 'learn', parts: ['languages'] });
    const families = [...container.querySelectorAll('nav.languages details.family')];
    expect(families.length).toBeGreaterThan(8);
    const open = families.filter((f) => f.open);
    expect(open).toHaveLength(1);
    expect(open[0].querySelector('a[aria-current=page]').textContent).toMatch(/Ancient Greek/);
    const all = [...container.querySelectorAll('nav.languages a')];
    expect(all.length).toBe(35);                                      // every language, not only this site's
    const ja = all.find((a) => a.textContent.includes('Japanese'));
    expect(ja.getAttribute('href')).toBe('https://allan-valin.github.io/casus-asia/ja/learn/');
    const de = all.find((a) => a.textContent.includes('German'));
    expect(de.getAttribute('href')).toMatch(/^\/de\/learn\/$/);         // this site: a local link
    const germanic = families.find((f) => f.querySelector('a') && [...f.querySelectorAll('a')].some((a) => a.textContent.includes('German')));
    expect([...germanic.querySelectorAll('a')].map((a) => a.textContent.replace('↗', '').trim())).toEqual(expect.arrayContaining(['German', 'English', 'Dutch', 'Swedish', 'Icelandic']));
  });

  it('the language list groups by family or by region, one group per language; Expand all / Collapse all (Allan, 2026-10-27)', async () => {
    const { container } = render(LanguageBar, { current: 'grc', view: 'learn', parts: ['languages'] });
    const groups = () => [...container.querySelectorAll('nav.languages details.family')];
    const codesIn = () => groups().map((g) => [...g.querySelectorAll('a')].map((a) => a.dataset.code));
    await fireEvent.click(container.querySelector('button.group-by[data-by="region"]'));
    const ids = groups().map((g) => g.dataset.group);
    expect(ids).toEqual(expect.arrayContaining(['europe', 'asia']));
    const all = codesIn().flat();
    expect(all).toHaveLength(35);
    expect(new Set(all).size).toBe(35);                                // no language in two groups
    const asia = codesIn()[ids.indexOf('asia')];
    expect(asia).toEqual(expect.arrayContaining(['ja', 'ko', 'zh', 'hi', 'vi', 'id']));
    await fireEvent.click(container.querySelector('button.expand-all'));
    expect(groups().every((g) => g.open)).toBe(true);
    await fireEvent.click(container.querySelector('button.collapse-all'));
    expect(groups().some((g) => g.open)).toBe(false);
    await fireEvent.click(container.querySelector('button.group-by[data-by="family"]'));
    expect(groups().map((g) => g.dataset.group)).toContain('germanic');
  });
});
