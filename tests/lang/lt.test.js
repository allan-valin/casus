import { describe, it, expect } from 'vitest';
import { getLanguage } from '../../src/lang/registry.js';
import { siteOf } from '../../src/sites.js';
import { stripLt, hasMarksLt } from '../../src/lang/lt/script.js';

describe('Lithuanian (2026-10-21, next in the accepted order)', () => {
  it('seven cases on the base Casus site, named in every interface language', () => {
    const lt = getLanguage('lt');
    expect(lt.inventory.channels.case.values).toEqual(expect.arrayContaining(['nom', 'gen', 'dat', 'acc', 'ins', 'loc', 'voc']));
    expect(siteOf('lt').id).toBe('casus');
    expect(lt.name.de).toBe('Litauisch'); expect(lt.name.mk).toBe('литвански');
    expect(lt.government.su).toEqual(['ins']); expect(lt.government.į).toEqual(['acc']);
  });
  it('keys drop the dictionary tone marks and keep the letters (mirror of tools/casus_build/lt.py)', () => {
    expect(stripLt('namai̇̃')).toBe('namai');
    expect(stripLt('skaitýti')).toBe('skaityti');
    expect(stripLt('namų̃')).toBe('namų');
    expect(stripLt('nãmą')).toBe('namą');
    expect(stripLt('Ėglė')).toBe('ėglė');
    expect(stripLt('šuõ')).toBe('šuo');
    expect(hasMarksLt('nãmas')).toBe(true); expect(hasMarksLt('namas')).toBe(false);
    expect(getLanguage('lt').script.strip('Šuõ')).toBe('šuo');
  });
});
