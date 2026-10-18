/* German words (umlauts, ß, hyphenated compounds whole) and punctuation. Keys keep case: nouns are
 * capitalised (das Essen ≠ essen). A capitalised word at the start of the sentence also gets a small-letter
 * altKey, so `Essen ist gut` offers the noun and the verb. The old spelling daß is read as dass. */
const RESPELL = { 'daß': 'dass', 'Daß': 'Dass' };
const WORD = /([\p{L}][\p{L}\p{M}'’-]*[\p{L}])|([\p{L}])|([^\s\p{L}]+)/gu;

export function tokenize(sentenceText) {
  const tokens = [];
  let first = true;
  let clause = 0;
  for (let m = WORD.exec(sentenceText); m; m = WORD.exec(sentenceText)) {
    const [raw, long, short] = m;
    const word = long ?? short;
    if (!word) { push(tokens, raw, 'punct', raw, m.index); if (/\.$/.test(raw)) first = true; if (/[,;:–—()\[\]]/.test(raw)) clause += 1; continue; }
    const key = RESPELL[word] ?? word.normalize('NFC');
    const t = push(tokens, word, 'word', key, m.index);
    t.clause = clause;
    const fallbacks = spellingVariants(key);
    if (fallbacks.length) t.fallbackKeys = fallbacks;
    if (first && /^\p{Lu}/u.test(key)) {
      const alt = key[0].toLowerCase() + key.slice(1);
      if (alt !== key) t.altKey = alt;
    }
    first = false;
  }
  // a capitalised word right before another capitalised word may be an adjective in a name
  // (der Deutschen Einheit, das Rote Kreuz): it is looked up in small letters too
  const words = tokens.filter((x) => x.kind === 'word');
  for (let k = 0; k + 1 < words.length; k += 1) {
    const w = words[k];
    if (w.altKey || w.index === 0 || words[k + 1].index !== w.index + 1) continue;
    if (/^\p{Lu}/u.test(w.key) && /^\p{Lu}/u.test(words[k + 1].key) && /(e|en|em|er|es)$/.test(w.key)) w.altKey = w.key[0].toLowerCase() + w.key.slice(1);
  }
  return tokens;
}

/* Older and poetic spellings the reform dictionary lacks: an e before -r/-l dropped in an inflected form
 * (ungeheueren → ungeheuren, unserer → unsrer is the other way and stays), and ß after a short vowel → ss
 * (muß → muss, Fluß → Fluss). Tried only when the word itself is not found. */
export function spellingVariants(key) {
  const out = [];
  const m = key.match(/^(.*)e([rl])(en|em|er|es|e)$/u);
  if (m) out.push(`${m[1]}${m[2]}${m[3]}`);
  if (key.includes('ß')) out.push(key.replace(/ß/g, 'ss'));
  return out.filter((k) => k !== key);
}

function push(tokens, surface, kind, key, start) {
  const t = { index: tokens.length, surface, key, kind, enclitic: null, start, end: start + surface.length };
  tokens.push(t);
  return t;
}
