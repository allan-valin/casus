import { describe, it, expect } from 'vitest';
import { version } from '../src/lib/version.js';

describe('smoke', () => {
  it('exposes a version string', () => {
    expect(version).toBe('0.1.0');
  });
});
