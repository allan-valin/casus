// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import ThemeControls from '../../src/app/components/ThemeControls.svelte';

const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

describe('dark/light and the colour identity menu (Allan, 2026-10-20)', () => {
  it('the mode button switches the page between light and dark and remembers it', async () => {
    const s = store(); s.setItem('casus:mode', 'light');
    const { container } = render(ThemeControls, { code: 'pt', storage: s });
    await tick();
    expect(document.documentElement.dataset.mode).toBe('light');
    await fireEvent.click(container.querySelector('button.mode'));
    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(s.getItem('casus:mode')).toBe('dark');
  });
  it('the menu lists the language’s flags and the Casus purple; choosing one recolours the page and is kept', async () => {
    const s = store();
    const { container } = render(ThemeControls, { code: 'pt', storage: s });
    await tick();
    const sel = container.querySelector('select.palette');
    expect([...sel.options].map((o) => o.value)).toEqual(['br', 'pt', 'ao', 'mz', 'casus']);
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#009c3b');
    await fireEvent.change(sel, { target: { value: 'pt' } });
    // Portugal takes its flag's red: Brazil already has the green (Allan, 2026-10-27: themes must look different)
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#da291c');
    expect(s.getItem('casus:theme:pt')).toBe('pt');
  });
});
