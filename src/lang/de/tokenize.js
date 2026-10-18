/* German words (umlauts, ß, hyphenated compounds whole) and punctuation. Keys keep case: nouns are
 * capitalised (das Essen ≠ essen). A capitalised word at the start of the sentence also gets a small-letter
 * altKey, so `Essen ist gut` offers the noun and the verb. The old spelling daß is read as dass. */
const RESPELL = { 'daß': 'dass', 'Daß': 'Dass' };
const WORD = /([\p{L}][\p{L}\p{M}'’-]*[\p{L}])|([\p{L}])|([^\s\p{L}]+)/gu;

export function tokenize(sentenceText) {
  const tokens = [];
  let first = true;
  for (let m = WORD.exec(sentenceText); m; m = WORD.exec(sentenceText)) {
    const [raw, long, short] = m;
    const word = long ?? short;
    if (!word) { push(tokens, raw, 'punct', raw, m.index); continue; }
    const key = RESPELL[word] ?? word.normalize('NFC');
    const t = push(tokens, word, 'word', key, m.index);
    if (first && /^\p{Lu}/u.test(key)) {
      const alt = key[0].toLowerCase() + key.slice(1);
      if (alt !== key) t.altKey = alt;
    }
    first = false;
  }
  return tokens;
}

function push(tokens, surface, kind, key, start) {
  const t = { index: tokens.length, surface, key, kind, enclitic: null, start, end: start + surface.length };
  tokens.push(t);
  return t;
}
