// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Help from '../../src/app/components/Help.svelte';
import { setLang } from '../../src/app/lib/i18n.svelte.js';

describe('the ? button explains the tab it is on (Allan, 2026-10-20)', () => {
  it('the reader keeps its own help', () => {
    setLang('en');
    const { container } = render(Help, { props: { onclose: () => {}, view: 'reader' } });
    expect(container.ownerDocument.body.textContent).toContain('What Casus does');
  });
  for (const [view, word] of [['learn', 'Learn'], ['drills', 'Drills'], ['speak', 'Pronunciation'], ['proof', 'Proofreading'], ['talk', 'Conversation practice']]) {
    it(`${view} shows help about ${view}, not the reader's`, () => {
      setLang('en');
      document.body.innerHTML = '';
      render(Help, { props: { onclose: () => {}, view } });
      const text = document.body.textContent;
      expect(text).toContain(word);
      expect(text).not.toContain('What Casus does');
    });
  }
  it('is in the interface language', () => {
    setLang('de'); document.body.innerHTML = '';
    render(Help, { props: { onclose: () => {}, view: 'learn' } });
    expect(document.body.textContent).toContain('Lernen');
    setLang('en');
  });
});
