import { describe, it, expect } from 'vitest';
import { LANGUAGES, getLanguage } from '../../src/lang/registry.js';

describe('language registry', () => {
  it('lists Latin first at the root path, each language with both names', () => {
    expect(LANGUAGES[0]).toMatchObject({ code: 'la', path: '/', name: { en: 'Latin', pt: 'Latim' } });
    for (const l of LANGUAGES) { expect(l.name.en).toBeTruthy(); expect(l.name.pt).toBeTruthy(); expect(l.path.startsWith('/')).toBe(true); }
  });
  it('a definition carries script, inventory, segment, tokenize, stages, government, arrange, eras, data and samples paths, voice', () => {
    const la = getLanguage('la');
    for (const k of ['script', 'inventory', 'segment', 'tokenize', 'stages', 'government', 'arrange', 'eras', 'dataPath', 'samplesPath', 'voice']) expect(la).toHaveProperty(k);
    expect(la.dataPath).toBe('/data/la');
    expect(la.samplesPath).toBe('/samples/la');
    expect(la.voice.espeak).toBe('la');
    expect(la.stages.length).toBeGreaterThanOrEqual(3);
    expect(typeof la.script.normalize).toBe('function');
    expect(la.script.spaced).toBe(true);
    expect(la.inventory.primary).toBe('case');
    expect(la.inventory.channels.case.values).toEqual(['nom', 'voc', 'gen', 'dat', 'acc', 'abl', 'loc']);
  });
  it('getLanguage of an unknown code is undefined', () => {
    expect(getLanguage('xx')).toBe(undefined);
  });
});
