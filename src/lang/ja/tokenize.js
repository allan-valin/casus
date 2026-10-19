/*
 * Japanese has no spaces: tokenize only separates runs of Japanese script (and of Latin letters or digits) from
 * punctuation; splitWords then cuts each run into dictionary words. Offsets are UTF-16 indices, like the rest.
 */
const JA = /[぀-ヿー㐀-鿿豈-﫿々〆ヶ]/u;
const LATIN = /[\p{L}\p{N}]/u;

export function tokenize(sentenceText) {
  const tokens = [];
  let i = 0;
  const text = sentenceText;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    const kind = JA.test(ch) ? 'ja' : LATIN.test(ch) ? 'latin' : 'punct';
    let j = i + 1;
    while (j < text.length && !/\s/.test(text[j]) && (kind === 'ja' ? JA.test(text[j]) : kind === 'latin' ? LATIN.test(text[j]) && !JA.test(text[j]) : !JA.test(text[j]) && !LATIN.test(text[j]))) j += 1;
    const surface = text.slice(i, j);
    tokens.push({ surface, kind: kind === 'punct' ? 'punct' : 'word', key: surface, run: kind === 'ja', start: i, end: j, enclitic: null });
    i = j;
  }
  return tokens;
}

const KATAKANA = /^[゠-ヿー]$/u;
const MAX = 12;

/**
 * Cut each Japanese run into dictionary words (rikaikun-style lookups, then the fewest words that cover the
 * run): every substring up to MAX characters is looked up; a word known only through the kana spelling of a
 * kanji word costs a little more; an unknown character costs more than a word, and an unknown katakana run
 * is one word (a loanword the dictionary lacks).
 */
export async function splitWords(tokens, lexicon) {
  const runs = tokens.filter((t) => t.run);
  const keys = new Set();
  for (const t of runs) {
    const cs = [...t.surface];
    for (let a = 0; a < cs.length; a += 1) for (let n = 1; n <= MAX && a + n <= cs.length; n += 1) keys.add(cs.slice(a, a + n).join(''));
  }
  const found = keys.size ? await lexicon.lookupAll([...keys]) : new Map();
  // a language with word frequencies (Chinese) breaks ties toward the commoner words: 在 + 学校, not 在学 + 校
  const ranks = lexicon.file ? await lexicon.file('wordfreq.json').catch(() => null) : null;
  const rarity = (word) => (!ranks ? 0 : ranks[word] ? Math.log10(ranks[word]) / 10 : 0.6);
  const cost = (word) => {
    const as = found.get(word) ?? [];
    if (!as.length) return null;
    return (as.every((x) => x.form === 'kana') ? 1.4 : 1) + rarity(word);
  };
  const out = [];
  for (const t of tokens) {
    if (!t.run) { out.push(t); continue; }
    const cs = [...t.surface];
    const n = cs.length;
    const best = Array(n + 1).fill(null);
    best[n] = { cost: 0, len: 0 };
    for (let a = n - 1; a >= 0; a -= 1) {
      let pick = null;
      const consider = (len, c) => {
        const total = c + best[a + len].cost;
        if (!pick || total < pick.cost - 1e-9 || (Math.abs(total - pick.cost) < 1e-9 && len > pick.len)) pick = { cost: total, len };
      };
      for (let len = Math.min(MAX, n - a); len >= 1; len -= 1) {
        const c = cost(cs.slice(a, a + len).join(''));
        if (c != null) consider(len, c);
      }
      if (KATAKANA.test(cs[a])) {
        let k = a;
        while (k < n && KATAKANA.test(cs[k])) k += 1;
        consider(k - a, 1.5);
      }
      consider(1, 2);
      best[a] = pick;
    }
    let a = 0;
    let offset = t.start;
    while (a < n) {
      const len = best[a].len;
      const surface = cs.slice(a, a + len).join('');
      out.push({ surface, kind: 'word', key: surface, start: offset, end: offset + surface.length, enclitic: null });
      offset += surface.length;
      a += len;
    }
  }
  return out;
}
