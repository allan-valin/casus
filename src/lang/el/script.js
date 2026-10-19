/* Modern Greek script (overnight 2026-10-19): keys in lower case without tonos or diaeresis, final sigma folded (as the
 * build does: tools/casus_build/generic.py el); Latin letters in the modern pronunciation, as ELOT 743 spells it
 * (β v, η i, υ y, αυ av/af, ευ ev/ef, μπ b at the start, ντ d at the start, γγ ng). */
export function stripEl(s) {
  return s.toLowerCase().normalize('NFD').replace(/[́̈̈́]/g, '').normalize('NFC').replace(/ς/g, 'σ');
}
export const hasMarksEl = (s) => /[́̈]/.test(s.normalize('NFD'));
const L = { α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o' };
const VOICED = new Set([...'αεηιουωβγδζλμνρ']);
export function romanizeEl(text) {
  const chars = [...text.normalize('NFD').replace(/[́̈́]/g, '').normalize('NFC')];
  let out = '';
  for (let i = 0; i < chars.length; i += 1) {
    const c = chars[i];
    const lower = c.toLowerCase();
    const n = (chars[i + 1] ?? '').toLowerCase().normalize('NFD')[0] ?? '';
    const n2 = (chars[i + 2] ?? '').toLowerCase();
    const start = i === 0 || !/\p{L}/u.test(chars[i - 1]);
    let r;
    let skip = 0;
    if ((lower === 'α' || lower === 'ε') && n === 'υ' && !/̈/.test((chars[i + 1] ?? '').normalize('NFD'))) { r = (lower === 'α' ? 'a' : 'e') + (VOICED.has(n2) || !n2 ? 'v' : 'f'); skip = 1; }
    else if (lower === 'ο' && n === 'υ') { r = 'ou'; skip = 1; }
    else if (lower === 'μ' && n === 'π') { r = start ? 'b' : 'mp'; skip = 1; }
    else if (lower === 'ν' && n === 'τ') { r = start ? 'd' : 'nt'; skip = 1; }
    else if (lower === 'γ' && (n === 'γ' || n === 'κ' || n === 'ξ' || n === 'χ')) { r = 'n'; }
    else r = L[lower.normalize('NFD')[0]] ?? c;
    out += c !== lower ? r[0].toUpperCase() + r.slice(1) : r;
    i += skip;
  }
  return out;
}
