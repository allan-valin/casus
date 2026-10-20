import { describe, it, expect } from 'vitest';
import { createProgression, levelOf, ACHIEVEMENTS } from '../../src/app/lib/progression.js';

/* Progression after Duolingo (Allan, 2026-10-20: "give extra lesson a % and every exercise EXP for level up (that does
 * nothing, just cosmetic), also achievements"). */
const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
const day = (d, h = 12) => new Date(`2026-10-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00`);

describe('XP and levels', () => {
  it('a right answer is worth 10 XP, a wrong one 1 (effort counts a little)', () => {
    const p = createProgression(store(), () => day(20));
    p.award({ correct: true, lang: 'la', kind: 'learn' });
    p.award({ correct: false, lang: 'la', kind: 'learn' });
    expect(p.state.xp).toBe(11);
  });
  it('levels grow further apart: level 2 at 100 XP, 3 at 300, 4 at 600', () => {
    expect(levelOf(0)).toMatchObject({ level: 1, from: 0, to: 100 });
    expect(levelOf(99).level).toBe(1);
    expect(levelOf(100).level).toBe(2);
    expect(levelOf(300)).toMatchObject({ level: 3, from: 300, to: 600 });
  });
  it('a level reached is reported once', () => {
    const p = createProgression(store(), () => day(20));
    let up = null;
    for (let i = 0; i < 10; i += 1) { const r = p.award({ correct: true, lang: 'la', kind: 'learn' }); if (r.levelUp) up = r.levelUp; }
    expect(up).toBe(2);
  });
  it('finishing a lesson (every question answered right once) gives 50 XP, once', () => {
    const p = createProgression(store(), () => day(20));
    const a = p.award({ correct: true, lang: 'la', kind: 'learn', lessonDone: true });
    expect(a.xp).toBe(60);
    expect(p.state.lessonsDone).toBe(1);
  });
});

describe('daily streak', () => {
  it('days in a row count; a missed day starts again', () => {
    let now = day(18);
    const p = createProgression(store(), () => now);
    p.award({ correct: true, lang: 'la', kind: 'learn' });
    now = day(19); p.award({ correct: true, lang: 'la', kind: 'learn' });
    now = day(20); p.award({ correct: true, lang: 'la', kind: 'learn' });
    expect(p.streak()).toBe(3);
    now = day(22); p.award({ correct: true, lang: 'la', kind: 'learn' });
    expect(p.streak()).toBe(1);
  });
  it('the streak shown today is still yesterday’s until today’s first answer', () => {
    let now = day(19);
    const p = createProgression(store(), () => now);
    p.award({ correct: true, lang: 'la', kind: 'learn' });
    now = day(20);
    expect(p.streak()).toBe(1);
    now = day(21);
    expect(p.streak()).toBe(0);
  });
});

describe('achievements', () => {
  it('the first right answer unlocks one; each unlocks once', () => {
    const p = createProgression(store(), () => day(20));
    expect(p.award({ correct: true, lang: 'la', kind: 'learn' }).unlocked).toContain('first');
    expect(p.award({ correct: true, lang: 'la', kind: 'learn' }).unlocked).not.toContain('first');
  });
  it('ten right in a row; three languages; five kinds of drill', () => {
    const p = createProgression(store(), () => day(20));
    const got = new Set();
    const add = (r) => r.unlocked.forEach((x) => got.add(x));
    for (let i = 0; i < 10; i += 1) add(p.award({ correct: true, lang: 'la', kind: 'learn' }));
    expect(got.has('row10')).toBe(true);
    add(p.award({ correct: true, lang: 'de', kind: 'drill:words' }));
    add(p.award({ correct: true, lang: 'ru', kind: 'drill:parse' }));
    expect(got.has('langs3')).toBe(true);
    for (const k of ['cloze', 'spot', 'match']) add(p.award({ correct: true, lang: 'la', kind: `drill:${k}` }));
    expect(got.has('drills5')).toBe(true);
  });
  it('every achievement has an id, an icon and a test of the state', () => {
    for (const a of ACHIEVEMENTS) { expect(a.id).toBeTruthy(); expect(a.icon).toBeTruthy(); expect(typeof a.test).toBe('function'); }
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
  });
});

describe('kept in this browser, and merged from a file', () => {
  it('state survives a reload', () => {
    const s = store();
    createProgression(s, () => day(20)).award({ correct: true, lang: 'la', kind: 'learn' });
    expect(createProgression(s, () => day(20)).state.xp).toBe(10);
  });
  it('a saved file merges: the larger XP and every achievement of both', () => {
    const p = createProgression(store(), () => day(20));
    p.award({ correct: true, lang: 'la', kind: 'learn' });
    p.merge({ xp: 500, unlocked: { row10: '2026-10-01' }, days: { '2026-10-01': 500 }, kinds: ['drill:words'], langs: ['de'], lessonsDone: 2, answers: 60, right: 50, best: 12, row: 0 });
    expect(p.state.xp).toBe(500);
    expect(p.state.unlocked.first).toBeTruthy();
    expect(p.state.unlocked.row10).toBe('2026-10-01');
    expect(p.state.days['2026-10-20']).toBe(10);
  });
});

describe('lesson completion (the lesson’s %, as in Duolingo: how much of it is done, not how well)', () => {
  it('distinct questions answered right over the lesson’s questions; a lesson is done once, at 100%', async () => {
    const { lessonAnswer, completion } = await import('../../src/app/lib/progression.js');
    const q = (k) => ({ prompt: `p${k}`, answer: `a${k}` });
    let rec = null; let done = false;
    for (const [k, ok] of [[1, true], [1, true], [2, false], [2, true]]) { const r = lessonAnswer(rec, q(k), ok, 3); rec = r.rec; done = done || r.done; }
    expect(completion(rec)).toBe(66);
    expect(completion({ ok: ['x'], of: 400 })).toBe(1);
    expect(rec.right).toBe(3); expect(rec.total).toBe(4);
    const r = lessonAnswer(rec, q(3), true, 3);
    expect(completion(r.rec)).toBe(100);
    expect(r.done).toBe(true);
    expect(lessonAnswer(r.rec, q(3), true, 3).done).toBe(false);
  });
  it('an old record (right/total only, before completion was kept) has no completion yet', async () => {
    const { completion } = await import('../../src/app/lib/progression.js');
    expect(completion({ right: 5, total: 6 })).toBe(null);
  });
});
