import { describe, it, expect } from 'vitest';
import fixture from '../fixtures/normalization.grc.json';
import { normalizeGrc, stripGrc, hasMarks } from '../../src/lang/grc/normalize.js';

describe('Greek normalisation (parity with tools/casus_build/grc/normalize.py)', () => {
  it('matches the shared fixture', () => { for (const [raw, out] of fixture.normalize) expect(normalizeGrc(raw), raw).toBe(out); });
  it('strips every mark for the second key', () => { for (const [raw, out] of fixture.strip) expect(stripGrc(raw), raw).toBe(out); });
  it('tells marked from unmarked input', () => { for (const [raw, out] of fixture.hasMarks) expect(hasMarks(raw), raw).toBe(out); });
});
