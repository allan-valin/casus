import { describe, it, expect } from 'vitest';
import { romanizeMk } from '../../src/lang/mk/romanize.js';
import { LETTERS } from '../../src/lang/mk/game.js';

describe('Macedonian', () => {
  it.each([['македонски', 'makedonski'], ['ѓавол', 'ǵavol'], ['ќерка', 'ḱerka'], ['ѕвезда', 'dzvezda'], ['џеб', 'džeb'], ['љубов', 'ljubov'], ['коњ', 'konj'], ['Скопје', 'Skopje'], ['жена', 'žena']])(
    '%s → %s', (c, r) => expect(romanizeMk(c)).toBe(r));
  it('the alphabet has its 31 letters', () => expect(LETTERS).toHaveLength(31));
});
