/*
 * Japanese sounds for the natural Piper voice (ja_JP-hi_fi_captain, Allan 2026-10-22). The voice was trained on
 * OpenJTalk sounds in IPA with pitch-accent marks (↑ rise, ↓ fall, # phrase boundary). The browser has no OpenJTalk:
 * the Conversation course carries those sounds from the build (tools/ja_phonemes.py). Text from elsewhere (a word in
 * the reader) falls back to its kana, converted mora by mora here, without accent marks.
 */
const ROWS = {
  あ: 'a', い: 'i', う: 'ɯ', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'kɯ', け: 'ke', こ: 'ko', が: 'ɡa', ぎ: 'ɡi', ぐ: 'ɡɯ', げ: 'ɡe', ご: 'ɡo',
  さ: 'sa', し: 'ɕi', す: 'sɯ', せ: 'se', そ: 'so', ざ: 'za', じ: 'dʑi', ず: 'zɯ', ぜ: 'ze', ぞ: 'zo',
  た: 'ta', ち: 'tɕi', つ: 'tsɯ', て: 'te', と: 'to', だ: 'da', ぢ: 'dʑi', づ: 'zɯ', で: 'de', ど: 'do',
  な: 'na', に: 'ni', ぬ: 'nɯ', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'ɸɯ', へ: 'he', ほ: 'ho',
  ば: 'ba', び: 'bi', ぶ: 'bɯ', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pɯ', ぺ: 'pe', ぽ: 'po',
  ま: 'ma', み: 'mi', む: 'mɯ', め: 'me', も: 'mo', や: 'ja', ゆ: 'jɯ', よ: 'jo',
  ら: 'ɾa', り: 'ɾi', る: 'ɾɯ', れ: 'ɾe', ろ: 'ɾo', わ: 'wa', を: 'o', ん: 'ɴ', ゔ: 'vɯ',
};
const SMALL_Y = { ゃ: 'a', ゅ: 'ɯ', ょ: 'o' };
const SMALL_V = { ぁ: 'a', ぃ: 'i', ぅ: 'ɯ', ぇ: 'e', ぉ: 'o' };
const PUNCT = { '。': '.', '．': '.', '！': '.', '!': '.', '？': '?', '?': '?', '、': ',', '，': ',' };
const VOWEL = /[aiɯeo]$/;
// these consonants are palatal already: しゃ is ɕa, not ɕʲa
const PALATAL = /(ɕ|tɕ|dʑ|j)$/;

/** kana (hiragana or katakana) → IPA, mora by mora; ー and おう lengthen the vowel, っ is a closure */
export function kanaToIpa(text) {
  const kana = [...text].map((c) => { const n = c.codePointAt(0); return n >= 0x30a1 && n <= 0x30f6 ? String.fromCodePoint(n - 0x60) : c; });
  let out = '';
  for (let i = 0; i < kana.length; i += 1) {
    const c = kana[i];
    if (SMALL_Y[c] && VOWEL.test(out)) { const stem = out.slice(0, -1); out = (PALATAL.test(stem) ? stem : `${stem}ʲ`) + SMALL_Y[c]; continue; }
    if (SMALL_V[c] && VOWEL.test(out)) { out = out.slice(0, -1) + SMALL_V[c]; continue; }
    if (c === 'っ') { out += 'ʔ'; continue; }
    if (c === 'ー') { const v = out.match(VOWEL); if (v) out += v[0]; continue; }
    if (c === 'う' && out.endsWith('o')) { out += 'o'; continue; }      // きょう = kʲoo
    if (ROWS[c]) { out += ROWS[c]; continue; }
    if (PUNCT[c]) out += PUNCT[c];
  }
  return out;
}

/** Piper input ids: start, each sound followed by a pad, end. `ipa`: the text is already the voice's symbols */
export function phonemeIds(text, map, { ipa = false } = {}) {
  const s = ipa ? text : kanaToIpa(text);
  const ids = [map['^'][0], map._[0]];
  for (const ch of s) if (map[ch]) ids.push(map[ch][0], map._[0]);
  ids.push(map.$[0]);
  return ids;
}
