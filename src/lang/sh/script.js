/* Serbo-Croatian keys (2026-10-21): lower case without the tone and length marks the dictionary writes on vowels and
 * syllabic r (kȕća, ку̏ћа); the marks of ć č š ž stay. Mirror of tools/casus_build/sh.py strip_sh. */
const BASES = new Set([...'aeiouAEIOUrRаеиоуАЕИОУрР']);
export function stripSh(s) {
  let out = '';
  for (const c of s.toLowerCase().normalize('NFD')) {
    if (/\p{M}/u.test(c) && BASES.has(out.at(-1))) continue;
    out += c;
  }
  return out.normalize('NFC');
}
export const hasMarksSh = (s) => stripSh(s) !== s.toLowerCase().normalize('NFC');
