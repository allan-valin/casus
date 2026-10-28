// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// live 2026-10-28: the worker's engine 404'd, the library told only onerror, and the ⇄ button waited forever
vi.mock('@browsermt/bergamot-translator/translator.js', () => ({
  TranslatorBacking: class { constructor(o) { this.o = o; } },
  LatencyOptimisedTranslator: class {
    constructor(opts) { setTimeout(() => opts.onerror(new Error('importScripts failed')), 5); }
    translate() { return new Promise(() => {}); }
  },
}));

describe('Bergamot worker failure', () => {
  it('fails the translation with the reason instead of hanging', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { translateHtml } = await import('../../src/app/lib/paraTranslate.js');
    await expect(translateHtml('Bonjour', 'fr', 'pt')).rejects.toThrow('importScripts failed');
  });
});
