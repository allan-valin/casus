/*
 * Hangul → Latin letters, the Revised Romanization of Korean (2000), with the sound changes it writes: a final
 * consonant moves onto a following vowel (한국어 hangugeo), ㅂ before ㄴ/ㅁ is m (합니다 hamnida), ㅎ is silent before a
 * vowel (좋아요 joayo), a final consonant is k/t/p (책 chaek, 꽃 kkot, 밥 bap), double finals keep one sound (읽다 ikda).
 */
const INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const VOWEL = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
// finals: [as the syllable ends, as it moves onto a following vowel]
const FINAL = [['', ''], ['k', 'g'], ['k', 'kk'], ['k', 'gs'], ['n', 'n'], ['n', 'nj'], ['n', 'nh'], ['t', 'd'], ['l', 'r'], ['k', 'lg'],
  ['m', 'lm'], ['l', 'lb'], ['l', 'ls'], ['l', 'lt'], ['p', 'lp'], ['l', 'lh'], ['m', 'm'], ['p', 'b'], ['p', 'ps'], ['t', 's'], ['t', 'ss'],
  ['ng', 'ng'], ['t', 'j'], ['t', 'ch'], ['k', 'k'], ['t', 't'], ['p', 'p'], ['t', 'h']];

function split(ch) {
  const c = ch.codePointAt(0) - 0xac00;
  if (c < 0 || c > 11171) return null;
  return { i: Math.floor(c / 588), v: Math.floor((c % 588) / 28), f: c % 28 };
}

export function romanizeKo(text) {
  const syl = [...text].map((ch) => split(ch) ?? ch);
  let out = '';
  for (let k = 0; k < syl.length; k += 1) {
    const s = syl[k];
    if (typeof s === 'string') { out += s; continue; }
    const next = syl[k + 1];
    let initial = INITIAL[s.i];
    const prev = syl[k - 1];
    if (prev && typeof prev === 'object' && prev.f && s.i === 11) initial = '';            // handled by the previous final
    if (prev && typeof prev === 'object' && prev.f === 27 && s.i === 11) initial = '';      // ㅎ before a vowel: silent
    out += initial + VOWEL[s.v];
    if (!s.f) continue;
    const vowelNext = next && typeof next === 'object' && next.i === 11;
    if (vowelNext) { out += s.f === 27 ? '' : FINAL[s.f][1]; continue; }
    // ㅂ/ㄱ before ㄴ, ㅁ nasalise (합니다 hamnida); ㄹ before a vowel is r (handled), before a consonant l
    if (next && typeof next === 'object' && (next.i === 2 || next.i === 6) && FINAL[s.f][0] === 'p') { out += 'm'; continue; }
    if (next && typeof next === 'object' && (next.i === 2 || next.i === 6) && FINAL[s.f][0] === 'k') { out += 'ng'; continue; }
    out += FINAL[s.f][0];
  }
  return out;
}
