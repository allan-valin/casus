/*
 * Kana → romaji, modified Hepburn as Wiktionary writes it (Allan, 2026-10-18/19: Latin letters under every
 * word): long vowels with a macron (がっこう gakkō, コーヒー kōhī; おう → ō, うう → ū, but おも-う stays omou only
 * where the う is a separate verb ending, which kana alone cannot tell: ō is used), small っ doubles the next
 * consonant (ch → tch), ん before a vowel or y is n'.
 */
const BASE = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko', が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do', な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', ゐ: 'i', ゑ: 'e', を: 'o', ん: 'n', ゔ: 'vu',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
};
const SMALL_Y = { ゃ: 'a', ゅ: 'u', ょ: 'o' };
const SMALL_V = { ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o' };

export function toHiragana(s) {
  return [...s].map((c) => { const cp = c.codePointAt(0); return cp >= 0x30a1 && cp <= 0x30f6 ? String.fromCodePoint(cp - 0x60) : c; }).join('');
}

function syllables(kana) {
  const chars = [...toHiragana(kana)];
  const out = [];
  for (let i = 0; i < chars.length; i += 1) {
    const c = chars[i];
    const n = chars[i + 1];
    if (c === 'っ') { out.push({ sokuon: true }); continue; }
    if (c === 'ー') { out.push({ long: true }); continue; }
    let r = BASE[c];
    if (r === undefined) { out.push({ r: c }); continue; }
    if (n && SMALL_Y[n] && r.endsWith('i') && c !== 'い') {
      r = (r === 'shi' || r === 'chi' || r === 'ji') ? r.slice(0, -1) + SMALL_Y[n] : r.slice(0, -1) + 'y' + SMALL_Y[n];
      i += 1;
    } else if (n && SMALL_V[n] && (c === 'ゔ' || c === 'ふ' || c === 'て' || c === 'で' || c === 'う' || c === 'し' || c === 'ち' || c === 'じ')) {
      const head = { ゔ: 'v', ふ: 'f', て: 't', で: 'd', う: 'w', し: 'sh', ち: 'ch', じ: 'j' }[c];
      r = head + SMALL_V[n];
      i += 1;
    }
    out.push({ r });
  }
  return out;
}

const MACRON = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' };
export function kanaToRomaji(kana, { verb = false } = {}) {
  const syl = syllables(kana);
  let s = '';
  for (let k = 0; k < syl.length; k += 1) {
    const x = syl[k];
    if (x.sokuon) {
      const next = syl[k + 1]?.r ?? '';
      s += next.startsWith('ch') ? 't' : (next[0] && /[a-z]/.test(next[0]) && !'aiueo'.includes(next[0]) ? next[0] : '');
      continue;
    }
    if (x.long) {
      const v = s.slice(-1);
      if (MACRON[v]) s = s.slice(0, -1) + MACRON[v];
      continue;
    }
    let r = x.r;
    const last = s.slice(-1);
    // おう / おお → ō, うう → ū (long vowels written with kana)
    const verbEnd = verb && k === syl.length - 1;                           // 思う omou: the う is the verb's ending
    if (!verbEnd && ((r === 'u' && last === 'o') || (r === 'o' && last === 'o'))) { s = s.slice(0, -1) + 'ō'; continue; }
    if (!verbEnd && r === 'u' && last === 'u') { s = s.slice(0, -1) + 'ū'; continue; }
    if (s.endsWith('n') && syl[k - 1]?.r === 'n' && /^[aiueoy]/.test(r)) s += "'";
    s += r;
  }
  return s;
}
