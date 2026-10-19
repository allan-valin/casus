import { describe, it, expect } from 'vitest';
import { romanizeEl, stripEl } from '../../src/lang/el/script.js';

describe('Modern Greek letters', () => {
  it.each([['καλημέρα', 'kalimera'], ['ευχαριστώ', 'efcharisto'], ['αυτοκίνητο', 'aftokinito'], ['μπύρα', 'byra'], ['ντομάτα', 'domata'],
    ['Αθήνα', 'Athina'], ['παιδί', 'paidi'], ['ουρανός', 'ouranos'], ['άγγελος', 'angelos'], ['ψωμί', 'psomi'], ['αυγό', 'avgo']])('%s → %s', (g, r) => expect(romanizeEl(g)).toBe(r));
  it('keys drop accents and diaeresis, final sigma folds', () => { expect(stripEl('Καλημέρα')).toBe('καλημερα'); expect(stripEl('προϊόν')).toBe('προιον'); expect(stripEl('λόγος')).toBe('λογοσ'); });
});
import { readFileSync } from 'node:fs';
describe('Modern Greek keys', () => { it('mirror the build', () => { for (const [w, s] of Object.entries(JSON.parse(readFileSync('tests/fixtures/el.strip.json', 'utf8')))) expect(stripEl(w)).toBe(s); }); });
