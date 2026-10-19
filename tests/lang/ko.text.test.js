import { describe, it, expect } from 'vitest';
import { romanizeKo } from '../../src/lang/ko/romanize.js';

describe('Korean romanisation (Revised Romanization, letter by letter with the common sound changes)', () => {
  it.each([
    ['한국어', 'hangugeo'], ['학교', 'hakgyo'], ['사랑해요', 'saranghaeyo'], ['감사합니다', 'gamsahamnida'], ['서울', 'seoul'],
    ['김치', 'gimchi'], ['책', 'chaek'], ['없어요', 'eopseoyo'], ['좋아요', 'joayo'], ['밥', 'bap'], ['꽃', 'kkot'], ['읽다', 'ikda'],
  ])('%s → %s', (k, r) => expect(romanizeKo(k)).toBe(r));
});
