// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import ProgressChip from '../../src/app/components/ProgressChip.svelte';
import { createProgression, ACHIEVEMENTS } from '../../src/app/lib/progression.js';

const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

describe('ProgressChip (level, XP, streak; the achievements panel)', () => {
  it('shows level and streak; opens a panel with XP and every achievement, unlocked ones marked', async () => {
    const p = createProgression(store(), () => new Date('2026-10-20T12:00:00'));
    for (let i = 0; i < 12; i += 1) p.award({ correct: true, lang: 'la', kind: 'learn' });
    const { container } = render(ProgressChip, { progression: p, version: 1 });
    expect(container.querySelector('.xp-chip').textContent).toContain('2');
    expect(container.querySelector('.xp-chip').textContent).toContain('🔥');
    await fireEvent.click(container.querySelector('.xp-chip'));
    await tick();
    const panel = document.querySelector('.xp-panel');
    expect(panel.textContent).toContain('120 XP');
    expect(panel.querySelectorAll('.ach').length).toBe(ACHIEVEMENTS.length);
    expect(panel.querySelectorAll('.ach.got').length).toBe(Object.keys(p.state.unlocked).length);
  });
  it('a toast for a level reached or an achievement', async () => {
    const p = createProgression(store());
    const { container } = render(ProgressChip, { progression: p, version: 1, toasts: [{ id: 1, text: 'Level 2!' }] });
    expect(container.querySelector('.xp-toast').textContent).toContain('Level 2!');
  });
});
