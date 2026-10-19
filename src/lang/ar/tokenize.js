import { vowelsAgree } from './normalize.js';
/*
 * Arabic words are runs of Arabic letters and their vowel marks. The key is the bare letters (normalize.js), so
 * the dictionary's vowelled spellings are all found and supplied; the key keeps the letters as written (a hamza
 * narrows the match), the lexicon folds them for the shard. splitWords then separates the proclitics
 * written onto a word — و "and", ف "so", ب "with, in", ل "for, to", ك "like" — when the word itself is not in the
 * dictionary but what follows them is (والكتاب: و + الكتاب; للبيت: ل + البيت, the article's alif dropped).
 */
import { lettersOf } from './normalize.js';

const WORD = /[ء-ي٠-٩ٮ-ۓۺ-ۿً-ٰٟـ]+/g;

export function tokenize(sentenceText) {
  const tokens = [];
  let at = 0;
  const pushPunct = (from, to) => {
    const piece = sentenceText.slice(from, to);
    for (const m of piece.matchAll(/\S+/g)) tokens.push({ surface: m[0], kind: 'punct', key: m[0], start: from + m.index, end: from + m.index + m[0].length, enclitic: null });
  };
  for (const m of sentenceText.matchAll(WORD)) {
    if (m.index > at) pushPunct(at, m.index);
    tokens.push({ surface: m[0], kind: 'word', key: lettersOf(m[0]), start: m.index, end: m.index + m[0].length, enclitic: null });
    at = m.index + m[0].length;
  }
  if (at < sentenceText.length) pushPunct(at, sentenceText.length);
  return tokens;
}

// [proclitics, whether the article's alif was dropped after them (ل + ال → لل)]
const SPLITS = [['وال', ['و']], ['فال', ['ف']], ['بال', ['ب']], ['كال', ['ك']], ['ولل', ['و', 'ل'], true], ['لل', ['ل'], true],
  ['وب', ['و', 'ب']], ['ول', ['و', 'ل']], ['فب', ['ف', 'ب']], ['فل', ['ف', 'ل']], ['و', ['و']], ['ف', ['ف']], ['ب', ['ب']], ['ل', ['ل']], ['ك', ['ك']]];

/** the surface cut after `n` base letters, marks kept with their letter */
function cut(surface, n) {
  let seen = 0;
  let i = 0;
  const chars = [...surface];
  for (; i < chars.length; i += 1) {
    if (!/[ً-ٰٟـ]/.test(chars[i])) { if (seen === n) break; seen += 1; }
  }
  return [chars.slice(0, i).join(''), chars.slice(i).join('')];
}

function candidates(t) {
  const out = [];
  // the basmala writes bi + ism without the alif of اسم (بسم الله)
  if (t.key.startsWith('بسم')) out.push({ clitics: ['ب'], restKey: `ا${t.key.slice(1)}`, prefixLen: 1 });
  // li + Allah writes two lams, not three (لله, ولله)
  for (const [pre, cl] of [['لله', ['ل']], ['ولله', ['و', 'ل']], ['فلله', ['ف', 'ل']]]) if (t.key === pre) out.push({ clitics: cl, restKey: 'الله', prefixLen: cl.length });
  for (const [prefix, clitics, alifDropped] of SPLITS) {
    if (!t.key.startsWith(prefix) || t.key.length <= prefix.length + (alifDropped ? 0 : 1)) continue;   // لله: li + Allah
    const restKey = (alifDropped ? 'ا' : '') + t.key.slice(prefix.length - (prefix.endsWith('ال') ? 2 : alifDropped ? 1 : 0));
    out.push({ clitics, restKey, prefixLen: prefix.length - (prefix.endsWith('ال') ? 2 : alifDropped ? 1 : 0) });
  }
  return out;
}

export async function splitWords(tokens, lexicon) {
  const words = tokens.filter((t) => t.kind === 'word');
  const keys = new Set(words.map((t) => t.key));
  for (const t of words) for (const c of candidates(t)) keys.add(c.restKey);
  const found = await lexicon.lookupAll([...keys]);
  // a word is known when a reading's vowels agree with the ones the text writes (بِسْمِ is not بَسَمَ)
  const known = (k, surface) => (found.get(k) ?? []).some((a) => vowelsAgree(surface, a.marked));
  const out = [];
  for (const t of tokens) {
    if (t.kind !== 'word' || known(t.key, t.surface)) { out.push(t); continue; }
    const c = candidates(t).find((x) => known(x.restKey, cut(t.surface, x.prefixLen)[1]));
    if (!c) { out.push(t); continue; }
    let [head, rest] = cut(t.surface, c.prefixLen);
    let at = t.start;
    for (const [k, clitic] of c.clitics.entries()) {
      const [one, more] = c.clitics.length > 1 && k === 0 ? cut(head, 1) : [head, ''];
      out.push({ surface: one, kind: 'word', key: clitic, start: at, end: at + one.length, enclitic: null, proclitic: true });
      at += one.length;
      head = more;
    }
    out.push({ surface: rest, kind: 'word', key: c.restKey, start: at, end: t.end, enclitic: null });
  }
  return out;
}
