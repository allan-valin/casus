import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { bucket } from '../../src/lang/ja/bucket.js';

it('the page buckets forms exactly as the build does (a mismatch is silent total lookup failure)', () => {
  const fixture = JSON.parse(readFileSync('tests/fixtures/ja.buckets.json', 'utf8'));
  for (const [w, b] of Object.entries(fixture)) expect(bucket(w)).toBe(b);
});
