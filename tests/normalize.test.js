import { describe, it, expect } from 'vitest';
import cases from './fixtures/normalization.json' with { type: 'json' };
import { normalizeForm } from '../src/lib/normalize.js';

describe('normalizeForm', () => {
  for (const { input, expected } of cases) {
    it(`normalizes "${input}"`, () => {
      expect(normalizeForm(input)).toBe(expected);
    });
  }
});
