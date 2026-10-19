// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { install, bookmarkletHref } from '../../src/app/lib/bookmarklet.js';

describe('Send to Casus bookmarklet (Allan, 2026-10-19)', () => {
  it('borders the paragraph under the pointer; a click offers Add to Casus, which sends its text (no furigana) to the casus tab', () => {
    document.body.innerHTML = '<article><p id="a"><ruby>猫<rt>ねこ</rt></ruby>が好きです。</p><p id="b">二つ目。</p></article>';
    const opened = [];
    const win = { open: (url, name) => { opened.push([url, name]); return {}; }, location: { hostname: 'www3.nhk.or.jp' } };
    install(document, win, 'https://allan-valin.github.io/casus/ja/');
    const a = document.getElementById('a');
    a.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(a.classList.contains('casus-pick')).toBe(true);
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
    const add = document.querySelector('.casus-menu button[data-act="add"]');
    expect(add.textContent).toMatch(/Casus/);
    add.click();
    expect(opened[0][1]).toBe('casus');
    const sent = new URL(opened[0][0]);
    const params = new URLSearchParams(sent.hash.slice(1));
    expect(params.get('append')).toBe('猫が好きです。');
    expect(params.get('from')).toBe('www3.nhk.or.jp');
  });
  it('Escape, or the bookmark again, switches it off', () => {
    document.body.innerHTML = '<p id="a">Text here long enough.</p>';
    const win = { open: () => ({}), location: { hostname: 'x' } };
    install(document, win, 'https://c/');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.getElementById('a').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(document.getElementById('a').classList.contains('casus-pick')).toBe(false);
  });
  it('the bookmark is a javascript: link carrying the language page', () => {
    const href = bookmarkletHref('https://allan-valin.github.io/casus/ja/');
    expect(href.startsWith('javascript:')).toBe(true);
    expect(href).toContain('allan-valin.github.io/casus/ja/');
  });
});
