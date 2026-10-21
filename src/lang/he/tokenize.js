/*
 * Hebrew words are runs of Hebrew letters and their points; a geresh or gershayim (also typed ' and ") inside a word
 * belongs to it (צה"ל, ג'ירפה). splitWords then separates the prefixes written onto a word — ו "and", ש / כש "that,
 * when", ב "in", כ "as", ל "to", מ "from", ה "the" — when the word itself is not in the dictionary but what follows
 * them is (והבית: ו + ה + בית; בבית: ב + בית, the article absorbed). The longest prefix that leaves a known word wins.
 */
import { stripHe } from './script.js';

// the maqaf (U+05BE) joins two words for the stress only: it stays outside, so אֶל־חַלּוֹנִי reads as two words
const WORD = /[\u05D0-\u05EA\u05F0-\u05F2\u0591-\u05BD\u05BF-\u05C7](?:[\u05D0-\u05EA\u05F0-\u05F2\u0591-\u05BD\u05BF-\u05C7\u05F3\u05F4]|['"](?=[\u05D0-\u05EA]))*/g;

export function tokenize(sentenceText) {
  const tokens = [];
  let at = 0;
  const pushPunct = (from, to) => {
    const piece = sentenceText.slice(from, to);
    for (const m of piece.matchAll(/\S+/g)) tokens.push({ surface: m[0], kind: 'punct', key: m[0], start: from + m.index, end: from + m.index + m[0].length, enclitic: null });
  };
  for (const m of sentenceText.matchAll(WORD)) {
    if (m.index > at) pushPunct(at, m.index);
    tokens.push({ surface: m[0], kind: 'word', key: stripHe(m[0]), start: m.index, end: m.index + m[0].length, enclitic: null });
    at = m.index + m[0].length;
  }
  if (at < sentenceText.length) pushPunct(at, sentenceText.length);
  return tokens;
}

const PREFIX = /^ו?(?:כש|ש)?[בכלמ]?ה?$/;

/** possible prefix cuts of a key, longest first: [prefix letters, rest] */
export function prefixCuts(key) {
  const out = [];
  for (let k = Math.min(4, key.length - 2); k >= 1; k -= 1) {
    const pre = key.slice(0, k);
    if (PREFIX.test(pre)) out.push([pre, key.slice(k)]);
  }
  return out;
}

/** the surface cut after `n` letters, points kept with their letter */
function cut(surface, n) {
  const chars = [...surface];
  let seen = 0;
  let i = 0;
  for (; i < chars.length; i += 1) {
    if (/[א-ת]/.test(chars[i])) { if (seen === n) break; seen += 1; }
  }
  return [chars.slice(0, i).join(''), chars.slice(i).join('')];
}

export async function splitWords(tokens, lexicon) {
  const words = tokens.filter((t) => t.kind === 'word');
  const keys = new Set(words.map((t) => t.key));
  for (const t of words) for (const [, rest] of prefixCuts(t.key)) keys.add(rest);
  const found = await lexicon.lookupAll([...keys]);
  const known = (k) => (found.get(k) ?? []).length > 0;
  const out = [];
  for (const t of tokens) {
    if (t.kind !== 'word' || known(t.key)) { out.push(t); continue; }
    const hit = prefixCuts(t.key).find(([, rest]) => known(rest));
    if (!hit) { out.push(t); continue; }
    const [pre, rest] = hit;
    let at = t.start;
    let surface = t.surface;
    // כש is one prefix ("when"); the others are one letter each
    const pieces = pre.startsWith('כש') ? ['כש', ...pre.slice(2)] : pre.match(/^ו?/)[0] && pre.slice(1).startsWith('כש') ? ['ו', 'כש', ...pre.slice(3)] : [...pre];
    for (const p of pieces) {
      const [head, more] = cut(surface, p.length);
      out.push({ surface: head, kind: 'word', key: p, start: at, end: at + head.length, enclitic: null, proclitic: true });
      at += head.length;
      surface = more;
    }
    out.push({ surface, kind: 'word', key: rest, start: at, end: t.end, enclitic: null });
  }
  return out;
}
