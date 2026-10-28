// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// the library cancels a pending translation when the next one arrives (SupersededError): two ⇄ clicks must queue
let busy = 0, most = 0;
vi.mock('@browsermt/bergamot-translator/translator.js', () => ({
  TranslatorBacking: class { constructor(o) { this.o = o; } hexToBase64() { return ''; } },
  LatencyOptimisedTranslator: class {
    constructor(opts, backing) { this.opts = opts; this.backing = backing; }
    async translate({ text }) {
      busy += 1; most = Math.max(most, busy);
      await new Promise((r) => setTimeout(r, 20));
      busy -= 1;
      return { target: { text: `T:${text}` } };
    }
  },
}));

describe('Bergamot translations (Allan 2026-10-28: a second click must not cancel or download twice)', () => {
  it('run one at a time and both finish; no download timeout', async () => {
    const { translateHtml } = await import('../../src/app/lib/paraTranslate.js');
    const [a, b] = await Promise.all([translateHtml('Bonjour', 'fr', 'pt'), translateHtml('Merci', 'fr', 'pt')]);
    expect(a).toBe('T:Bonjour');
    expect(b).toBe('T:Merci');
    expect(most).toBe(1);
  });
});
