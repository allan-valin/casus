/*
 * Arabic → Latin letters, as Wiktionary writes it (DIN-like: ṯ ḥ ḵ ḏ š ṣ ḍ ṭ ẓ ʕ ḡ, hamza ʔ, long vowels with a
 * macron), from the vowelled form the dictionary supplies (Allan, 2026-10-18: Latin letters under every word).
 * The article: al- before a moon letter, assimilated before a sun letter (aš-šams). Unvowelled text gives the
 * consonants and the long vowels only.
 */
const C = { ب: 'b', ت: 't', ث: 'ṯ', ج: 'j', ح: 'ḥ', خ: 'ḵ', د: 'd', ذ: 'ḏ', ر: 'r', ز: 'z', س: 's', ش: 'š', ص: 'ṣ', ض: 'ḍ', ط: 'ṭ', ظ: 'ẓ',
  ع: 'ʕ', غ: 'ḡ', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', ء: 'ʔ', أ: 'ʔ', إ: 'ʔ', ؤ: 'ʔ', ئ: 'ʔ', پ: 'p', چ: 'č', ڤ: 'v', گ: 'g' };
const VOWEL = { 'َ': 'a', 'ُ': 'u', 'ِ': 'i', 'ً': 'an', 'ٌ': 'un', 'ٍ': 'in' };
const SHADDA = 'ّ';
const SUKUN = 'ْ';
const DAGGER = 'ٰ';
const MARK = /[ً-ْٰ]/;

function letters(word) {
  const out = [];
  for (const ch of word.normalize('NFC').replace(/ـ/g, '')) {
    if (MARK.test(ch) && out.length) out[out.length - 1].marks += ch; else out.push({ ch, marks: '' });
  }
  return out;
}

function one(word) {
  const ls = letters(word);
  let s = '';
  let i = 0;
  // the article
  if ((ls[0]?.ch === 'ا' || ls[0]?.ch === 'ٱ') && ls[1]?.ch === 'ل' && ls.length > 3) {
    const third = ls[2];
    if (third.marks.includes(SHADDA) && C[third.ch] && third.ch !== 'ل') { s = `a${C[third.ch]}-`; i = 2; ls[2] = { ...third, marks: third.marks.replace(SHADDA, '') }; }
    else { s = 'al-'; i = 2; }
  }
  for (; i < ls.length; i += 1) {
    const { ch, marks } = ls[i];
    const vowel = [...marks].map((m) => VOWEL[m] ?? '').join('');
    const prev = s.slice(-1);
    if (ch === 'ا' || ch === 'ى' || ch === 'ٱ') {
      if (ls[i - 1]?.marks.includes('ً')) continue;                 // the alif that carries tanwin -an
      if (i === 0 && vowel) { s += vowel; continue; }                 // an initial alif with a vowel is that vowel (hamzat al-waṣl)
      if (prev === 'a') s = `${s.slice(0, -1)}ā`; else if (i === 0 || ch === 'ٱ') s += 'a'; else s += 'ā';
      s += vowel;
      continue;
    }
    if (ch === 'آ') { s += 'ʔā'; continue; }
    if (ch === 'ة') { s += vowel ? `t${vowel}` : (prev === 'a' ? '' : 'a'); continue; }
    if ((ch === 'و' || ch === 'ي') && !vowel && !marks.includes(SHADDA) && !marks.includes(SUKUN) && prev === (ch === 'و' ? 'u' : 'i')) {
      s = `${s.slice(0, -1)}${ch === 'و' ? 'ū' : 'ī'}`;
      continue;
    }
    let c = ch === 'و' ? 'w' : ch === 'ي' ? 'y' : C[ch];
    if (c === undefined) { s += ch; continue; }
    if (marks.includes(SHADDA)) c += c;
    s += c + vowel + (marks.includes(DAGGER) ? 'ā' : '');
  }
  return s;
}

export function romanizeAr(text) {
  return text.split(/(\s+)/).map((w) => (/\s/.test(w) ? w : one(w))).join('');
}
