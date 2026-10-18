import { describe, it, expect } from 'vitest';
import { createActivity } from '../../src/app/lib/activity.svelte.js';

/* Copied from Desembarque (feedback E): one line per action and its outcome, a busy flag while a
 * request is unanswered, a "slow" line once per busy spell after four seconds. */
describe('activity', () => {
  it('keeps a timestamped line per action, newest last, capped at 400', () => {
    let now = 0;
    const a = createActivity({ now: () => now, cap: 400 });
    a.say('read 3 sentences');
    now = 61_000;
    a.say('pinned Gallia as nominative', 'ok');
    expect(a.lines.map((l) => l.msg)).toEqual(['read 3 sentences', 'pinned Gallia as nominative']);
    expect(a.lines[1].at).toMatch(/^\d\d:\d\d:\d\d$/);
    expect(a.lines[1].kind).toBe('ok');
    for (let i = 0; i < 450; i += 1) a.say(`x${i}`);
    expect(a.lines).toHaveLength(400);
    expect(a.lines[399].msg).toBe('x449');
  });
  it('wraps fetch: busy while anything is pending, a slow line after 4 s once per spell', async () => {
    let now = 0;
    const timers = [];
    const a = createActivity({ now: () => now, schedule: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, cancel: (id) => { timers[id - 1] = null; } });
    let resolve;
    const slow = new Promise((r) => { resolve = r; });
    const fetchImpl = a.wrap(() => slow);
    const p = fetchImpl('/data/forms/ro.json');
    expect(a.busy).toBe(true);
    timers[0].fn();                                  // the 4 s timer fires
    expect(a.lines.at(-1).msg).toMatch(/slow|busy|taking/i);
    now = 5000;
    resolve({ ok: true });
    await p;
    expect(a.busy).toBe(false);
    const quick = a.wrap(async () => ({ ok: true }));
    await quick('/x');
    expect(a.lines.filter((l) => /slow|busy|taking/i.test(l.msg))).toHaveLength(1);   // said once
  });
  it('logs a failed request as an error line and rethrows', async () => {
    const a = createActivity({ now: () => 0, schedule: () => 1, cancel: () => {} });
    const bad = a.wrap(async () => { throw new Error('network down'); });
    await expect(bad('/data/x')).rejects.toThrow('network down');
    expect(a.lines.at(-1).kind).toBe('err');
    expect(a.lines.at(-1).msg).toMatch(/network down/);
  });
});
