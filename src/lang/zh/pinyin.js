/*
 * Pinyin cut into syllables, each with its tone (1–4, 0 for neutral), so the tones can be coloured (Allan,
 * 2026-10-18: make the tone marks obvious). Greedy longest match against the syllables of Mandarin, read without
 * the tone marks; an apostrophe or a space separates.
 */
const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w', ''];
const FINALS = ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong', 'er', 'ia', 'ie', 'iao', 'iu', 'ian', 'in', 'iang', 'ing',
  'iong', 'ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang', 'ueng', 'üe', 'üan', 'ün', 'ue', 'van', 've', 'ng', 'n', 'm', 'r'];
const SYLLABLES = new Set();
for (const i of INITIALS) for (const f of FINALS) SYLLABLES.add(i + f);
const TONE = { ā: 1, á: 2, ǎ: 3, à: 4, ē: 1, é: 2, ě: 3, è: 4, ī: 1, í: 2, ǐ: 3, ì: 4, ō: 1, ó: 2, ǒ: 3, ò: 4, ū: 1, ú: 2, ǔ: 3, ù: 4, ǖ: 1, ǘ: 2, ǚ: 3, ǜ: 4, ḿ: 2, ń: 2, ň: 3, ǹ: 4 };
const BASE = (c) => { const d = c.normalize('NFD').replace(/[̀-̄̌]/g, ''); return d.normalize('NFC').toLowerCase(); };

export function pinyinSyllables(text) {
  const chars = [...text.normalize('NFC')];
  const out = [];
  let i = 0;
  while (i < chars.length) {
    if (!/\p{L}/u.test(chars[i])) { out.push([chars[i], null]); i += 1; continue; }
    let len = 0;
    for (let n = Math.min(6, chars.length - i); n >= 1; n -= 1) {
      const base = chars.slice(i, i + n).map(BASE).join('');
      if (!SYLLABLES.has(base)) continue;
      // a final n/ng/r followed by a vowel belongs to the next syllable (xi'an is written with the apostrophe)
      const next = chars[i + n] ? BASE(chars[i + n]) : '';
      if (/[aeiouü]/.test(next) && /[ngr]$/.test(base) && SYLLABLES.has(chars.slice(i, i + n - 1).map(BASE).join(''))) continue;
      len = n;
      break;
    }
    if (!len) { out.push([chars[i], null]); i += 1; continue; }
    const syl = chars.slice(i, i + len).join('');
    const tone = [...syl].map((c) => TONE[c.toLowerCase()]).find(Boolean) ?? 0;
    out.push([syl, tone]);
    i += len;
  }
  return out;
}
