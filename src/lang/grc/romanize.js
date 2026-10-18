/*
 * Ancient Greek → Latin letters, the usual scholarly scheme (Allan, 2026-10-18: a transliteration under the word):
 * η ē, ω ō, θ th, φ ph, χ ch, ψ ps, ξ x, υ y (u in a diphthong), γ before γ κ ξ χ = n, rough breathing h (rh on ρ),
 * iota subscript i. Accents are dropped: the line is for reading the letters, the IPA in the entry has the rest.
 */
const LETTERS = { α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'ē', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x',
  ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', ϲ: 's', τ: 't', υ: 'y', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'ō', ϝ: 'w' };
const DIPHTHONGS = new Set(['αυ', 'ευ', 'ηυ', 'ου', 'υι', 'αι', 'ει', 'οι']);
const ROUGH = '̔';
const SUBSCRIPT = 'ͅ';
const DIAERESIS = '̈';

export function romanizeGrc(word) {
  const chars = [];
  for (const ch of word.normalize('NFD')) {
    if (/\p{M}/u.test(ch)) { if (chars.length) chars[chars.length - 1].marks += ch; continue; }
    chars.push({ base: ch.toLowerCase(), upper: ch !== ch.toLowerCase(), marks: '' });
  }
  let out = '';
  for (let i = 0; i < chars.length; i += 1) {
    const c = chars[i];
    const n = chars[i + 1];
    if (!(c.base in LETTERS)) { out += c.upper ? c.base.toUpperCase() : c.base; continue; }
    let piece;
    let rough = c.marks.includes(ROUGH);
    if (n && DIPHTHONGS.has(c.base + n.base) && !n.marks.includes(DIAERESIS)) {
      rough = rough || n.marks.includes(ROUGH);
      piece = (c.base === 'υ' ? 'u' : LETTERS[c.base]) + (n.base === 'υ' ? 'u' : LETTERS[n.base]) + (n.marks.includes(SUBSCRIPT) ? 'i' : '');
      i += 1;
    } else if (c.base === 'γ' && n && 'γκξχ'.includes(n.base)) {
      piece = 'n';
    } else if (c.base === 'ρ' && rough) {
      piece = 'rh'; rough = false;
    } else {
      piece = LETTERS[c.base] + (c.marks.includes(SUBSCRIPT) ? 'i' : '');
    }
    if (rough) piece = `h${piece}`;
    if (c.upper) piece = piece[0].toUpperCase() + piece.slice(1);
    out += piece;
  }
  return out;
}
