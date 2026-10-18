// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Paradigm from '../../src/app/components/Paradigm.svelte';
import { getLanguage } from '../../src/lang/registry.js';

const la = getLanguage('la');
const rows = [['rosa', 'nnsf', 'nbsf', 'nvsf'], ['rosae', 'ngsf', 'ndsf', 'nnpf', 'nvpf'], ['rosam', 'nasf'], ['rosarum', 'ngpf'], ['rosis', 'ndpf', 'nbpf'], ['rosas', 'napf']];

describe('Paradigm', () => {
  it('draws the declension with case names and marks the readings still open for this word', () => {
    const { container } = render(Paradigm, { rows, lemma: '33803', lang: la, form: 'rosa', readings: ['nnsf', 'nbsf'] });
    expect(container.querySelector('table')).not.toBe(null);
    expect(container.textContent).toMatch(/ablative/);
    const marked = [...container.querySelectorAll('td.reading')].map((td) => td.dataset.cell);
    expect(marked.sort()).toEqual(['abl|sg', 'nom|sg']);
    // the same spelling in a cell the cascade ruled out is marked more lightly
    expect([...container.querySelectorAll('td.same-form')].map((td) => td.dataset.cell)).toEqual(['voc|sg']);
    expect(container.querySelector('details').open).toBe(true);
  });
});
