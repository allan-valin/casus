import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';
import { stripSh } from '../../src/lang/sh/script.js';

describe('Serbo-Croatian (2026-10-21, next in the accepted order)', () => {
  it('seven cases on the base Casus site; prepositions in both scripts', () => {
    const sh = getLanguage('sh');
    expect(siteOf('sh').id).toBe('casus');
    expect(sh.inventory.channels.case.values).toEqual(expect.arrayContaining(['nom', 'gen', 'dat', 'acc', 'voc', 'loc', 'ins']));
    expect(sh.government.sa).toEqual(['ins', 'gen']);
    expect(sh.government.са).toEqual(['ins', 'gen']);
    expect(sh.government.између).toEqual(['gen']);
    expect(sh.name.de).toBe('Serbokroatisch');
  });
  it('keys drop tone and length marks on vowels, keep ć č š ž (mirror of tools/casus_build/sh.py)', () => {
    expect(stripSh('kȕća')).toBe('kuća');
    expect(stripSh('kȕćē')).toBe('kuće');
    expect(stripSh('ку̏ћа')).toBe('кућа');
    expect(stripSh('vȑh')).toBe('vrh');
    expect(stripSh('Ćuprija')).toBe('ćuprija');
    expect(stripSh('šúma')).toBe('šuma');
  });
});
