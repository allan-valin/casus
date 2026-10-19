/* Sanskrit in Devanagari (overnight 2026-10-19): keys without Vedic accents (॑ ॒ ᳚) or footnote digits; Latin letters in
 * IAST (ā ī ū ṛ ṝ ḷ ṃ ḥ ṅ ñ ṭ ḍ ṇ ś ṣ), the inherent a written unless a virama or a vowel sign replaces it. */
// a word-final anusvara is the final m the dictionary writes (वनं = वनम्)
export const cleanSa = (s) => s.normalize('NFC').replace(/[\u0951-\u0954\u1cd0-\u1cff0-9]/gu, '').replace(/\u0902$/u, '\u092e\u094d');
const C = { क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'ṅ', च: 'c', छ: 'ch', ज: 'j', झ: 'jh', ञ: 'ñ', ट: 'ṭ', ठ: 'ṭh', ड: 'ḍ', ढ: 'ḍh', ण: 'ṇ',
  त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n', प: 'p', फ: 'ph', ब: 'b', भ: 'bh', म: 'm', य: 'y', र: 'r', ल: 'l', व: 'v', श: 'ś', ष: 'ṣ', स: 's', ह: 'h', ळ: 'ḷ' };
const V = { अ: 'a', आ: 'ā', इ: 'i', ई: 'ī', उ: 'u', ऊ: 'ū', ऋ: 'ṛ', ॠ: 'ṝ', ऌ: 'ḷ', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au' };
const M = { 'ा': 'ā', 'ि': 'i', 'ी': 'ī', 'ु': 'u', 'ू': 'ū', 'ृ': 'ṛ', 'ॄ': 'ṝ', 'ॢ': 'ḷ', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au' };
export function romanizeSa(text) {
  const chars = [...cleanSa(text)];
  let out = '';
  for (let i = 0; i < chars.length; i += 1) {
    const c = chars[i];
    const n = chars[i + 1];
    if (C[c] !== undefined) {
      out += C[c];
      if (n === '्') { i += 1; continue; }
      if (n && M[n] !== undefined) { out += M[n]; i += 1; continue; }
      out += 'a';
      continue;
    }
    if (V[c] !== undefined) { out += V[c]; continue; }
    if (c === 'ं') { out += 'ṃ'; continue; }
    if (c === 'ः') { out += 'ḥ'; continue; }
    if (c === 'ँ') { out += 'm̐'; continue; }
    if (c === 'ऽ') { out += "'"; continue; }
    if (c === '।' || c === '॥') { out += c === '।' ? '|' : '||'; continue; }
    out += c;
  }
  return out;
}
export const stripSa = (s) => cleanSa(s);
