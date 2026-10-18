// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Legend from '../../src/app/components/Legend.svelte';
import { LEGEND } from '../../src/app/lib/colors.js';

describe('Legend', () => {
  it('draws one row per legend entry with a swatch, a badge and the meaning', () => {
    const { container } = render(Legend);
    const rows = container.querySelectorAll('.legend tr.row');
    expect(rows).toHaveLength(LEGEND.length);
    expect(container.textContent).toMatch(/nominative/i);
    expect(container.textContent).toMatch(/plural/i);
    expect(container.textContent).toMatch(/pinned/i);
    expect(container.querySelectorAll('.swatch')).toHaveLength(LEGEND.length);
  });
});
