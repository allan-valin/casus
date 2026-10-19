/* Russian words (letters, a stress mark if typed, an inner hyphen as in из-за); the key is lower case, stress kept;
 * clauses between , ; : are numbered for the clause rules. */
const WORD = /[\p{L}̀́]+(?:-[\p{L}̀́]+)*/gu;
export function tokenize(sentenceText) {
  const tokens = [];
  let at = 0;
  let clause = 0;
  const punct = (from, to) => {
    for (const m of sentenceText.slice(from, to).matchAll(/\S+/g)) {
      tokens.push({ surface: m[0], kind: 'punct', key: m[0], start: from + m.index, end: from + m.index + m[0].length, enclitic: null });
      if (/[,;:—]/.test(m[0])) clause += 1;
    }
  };
  for (const m of sentenceText.matchAll(WORD)) {
    if (m.index > at) punct(at, m.index);
    tokens.push({ surface: m[0], kind: 'word', key: m[0].toLowerCase().normalize('NFC'), start: m.index, end: m.index + m[0].length, enclitic: null, clause });
    at = m.index + m[0].length;
  }
  if (at < sentenceText.length) punct(at, sentenceText.length);
  return tokens;
}
