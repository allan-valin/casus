import { describe, it, expect } from 'vitest';
import { korean as ko } from '../../src/lang/ko/index.js';
describe('Korean Conversation levels (Allan, 2026-10-28)', () => {
  it('are named TOPIK 1 … 6, not A1 … C2', () => {
    expect(ko.levelNames.A1).toBe('TOPIK 1');
    expect(ko.levelNames.B1).toBe('TOPIK 3');
    expect(ko.levelNames.C2).toBe('TOPIK 6');
  });
});
