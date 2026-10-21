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
    if (!word) {
      if (/^\d+([.,]\d+)*$/.test(raw)) { push(tokens, raw, 'number', raw, m.index); continue; }
      push(tokens, raw, 'punct', raw, m.index); if (/\.$/.test(raw)) first = true; if (/[,;:–—()\[\]]/.test(raw)) clause += 1; continue;
    }
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
  // CL6: a word that may be a separable particle at the end of a clause; every other word of the clause
  // is also looked up with that particle in front (ruft + an → anruft), so the stage can join them
  const PARTICLES = new Set(['ab', 'an', 'auf', 'aus', 'bei', 'ein', 'fest', 'fort', 'her', 'hin', 'los', 'mit', 'nach', 'vor', 'weg', 'zu', 'zurück', 'zusammen', 'vorbei', 'weiter', 'heraus', 'herein', 'hinaus', 'hinein', 'herum', 'um', 'durch', 'über', 'wieder', 'statt', 'teil', 'kennen', 'frei', 'nieder', 'empor', 'entgegen']);
  const ws = tokens.filter((x) => x.kind === 'word');
  const byClause = new Map();
  for (const w of ws) { if (!byClause.has(w.clause)) byClause.set(w.clause, []); byClause.get(w.clause).push(w); }
  for (const group of byClause.values()) {
    const last = group[group.length - 1];
    if (group.length < 2 || !PARTICLES.has(last.key.toLowerCase())) continue;
    for (const w of group.slice(0, -1)) if (/^\p{Ll}/u.test(w.key)) w.extraKeys = [last.key.toLowerCase() + w.key];
  }
  // bis between two numbers is a range (90 bis 105), not a preposition
  tokens.forEach((t, k) => { if (t.kind === 'word' && t.key.toLowerCase() === 'bis' && tokens[k - 1]?.kind === 'number' && tokens[k + 1]?.kind === 'number') t.range = true; });
  // a capitalised word right before another capitalised word may be an adjective in a name
  // (der Deutschen Einheit, das Rote Kreuz): it is looked up in small letters too
  const words = tokens.filter((x) => x.kind === 'word');
  for (let k = 0; k + 1 < words.length; k += 1) {
    const w = words[k];
    if (w.altKey || w.index === 0 || words[k + 1].index !== w.index + 1) continue;
    if (/^\p{Lu}/u.test(w.key) && /^\p{Lu}/u.test(words[k + 1].key) && /(e|en|em|er|es)$/.test(w.key)) w.altKey = w.key[0].toLowerCase() + w.key.slice(1);
  }
  // NP13: a capitalised word in -s right before another capitalised word may be a name in the Saxon genitive
  // (Peters Buch): its stem is looked up too
  for (let k = 0; k + 1 < words.length; k += 1) {
    const w = words[k];
    if (words[k + 1].index !== w.index + 1 || !/^\p{Lu}\p{Ll}+[^s]s$/u.test(w.key) || !/^\p{Lu}/u.test(words[k + 1].key)) continue;
    w.saxonKey = w.key.slice(0, -1);
    w.extraKeys = [...(w.extraKeys ?? []), w.saxonKey];
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
