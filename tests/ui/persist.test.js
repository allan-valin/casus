import { describe, it, expect, vi } from 'vitest';
import { textHash, createAutosave, restore } from '../../src/app/lib/persist.js';

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

describe('textHash', () => {
  it('is stable and differs for different texts', () => {
    expect(textHash('Rosa bona.')).toBe(textHash('Rosa bona.'));
    expect(textHash('Rosa bona.')).not.toBe(textHash('Rosa mala.'));
    expect(textHash('x')).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('createAutosave', () => {
  it('debounces writes and reports pending until flushed', () => {
    const storage = fakeStorage();
    const timers = [];
    const schedule = vi.fn((fn, ms) => { timers.push(fn); return timers.length; });
    const cancel = vi.fn();
    const auto = createAutosave({ storage, key: 'casus:1', delay: 300, schedule, cancel });
    auto.save({ a: 1 });
    auto.save({ a: 2 });
    expect(auto.pending()).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(storage.map.size).toBe(0);
    timers.at(-1)();
    expect(auto.pending()).toBe(false);
    expect(JSON.parse(storage.getItem('casus:1'))).toEqual({ a: 2 });
  });

  it('flush writes immediately', () => {
    const storage = fakeStorage();
    const auto = createAutosave({ storage, key: 'k', schedule: () => 1, cancel: () => {} });
    auto.save({ b: 1 });
    auto.flush();
    expect(JSON.parse(storage.getItem('k'))).toEqual({ b: 1 });
    expect(auto.pending()).toBe(false);
  });

  it('survives a storage that throws (private window, quota)', () => {
    const storage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
    const auto = createAutosave({ storage, key: 'k', schedule: (fn) => { fn(); return 1; }, cancel: () => {} });
    expect(auto.loaded()).toBe(null);
    expect(() => auto.save({ c: 1 })).not.toThrow();
    expect(auto.pending()).toBe(false);
  });

  it('loads what was saved under the key', () => {
    const storage = fakeStorage({ k: JSON.stringify({ text: 'Rosa.', pins: [] }) });
    expect(createAutosave({ storage, key: 'k', schedule: () => 1, cancel: () => {} }).loaded()).toEqual({ text: 'Rosa.', pins: [] });
  });
});

describe('restore', () => {
  it('returns the saved object only when its text matches exactly', () => {
    const saved = { text: 'Rosa bona.', selected: 0, pins: [], order: { 0: [1, 0] } };
    expect(restore(saved, 'Rosa bona.')).toBe(saved);
    expect(restore(saved, 'Rosa bona. Urbs.')).toBe(null);
    expect(restore(null, 'Rosa bona.')).toBe(null);
    expect(restore('garbage', 'Rosa bona.')).toBe(null);
  });
});
