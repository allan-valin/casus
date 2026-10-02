import { normalizeForm } from './normalize.js';

/*
 * Deliberately replaceable (spec §5.2, §10.3): nothing downstream may assume a
 * token came from whitespace splitting, because scriptio continua gets its own
 * tokenizer in v2. The contract is the Token shape, not this algorithm.
 */

const ENCLITICS = ['que', 'ue', 'ne'];
const NEVER_SPLIT = new Set([
  'quinque', 'neque', 'usque', 'atque', 'itaque', 'denique', 'undique', 'quisque',
  'uterque', 'plerumque', 'namque', 'quoque', 'absque', 'cunque', 'utique', 'quicumque',
  'quaecumque', 'quodcumque', 'ubique', 'utrimque', 'quandoque', 'utroque', 'utraque',
  'bene', 'sine', 'omne', 'paene', 'pone', 'mane', 'plane', 'sane', 'fine', 'nomine',
  'carmine', 'flumine', 'lumine', 'crimine', 'homine', 'uirgine', 'legione',
]);

/**
 * Split a sentence into word and punctuation tokens, detaching enclitics.
 * `index` is the reading-order position the UI shows; `key` is the normalised
 * lookup key; `start`/`end` are offsets into the sentence text. The host word
 * records which enclitic was detached; the enclitic token itself carries null.
 */
export function tokenize(sentenceText) {
  const tokens = [];
  const re = /(\p{L}+)|([^\s\p{L}]+)/gu;
  for (let m = re.exec(sentenceText); m; m = re.exec(sentenceText)) {
    const [raw, word, punct] = m;
    if (punct) {
      push(tokens, { surface: raw, kind: 'punct', enclitic: null, start: m.index });
      continue;
    }
    const { parts, enclitic } = splitEnclitic(word);
    let offset = m.index;
    parts.forEach((part, i) => {
      const isHost = parts.length > 1 && i === 0;
      push(tokens, { surface: part, kind: 'word', enclitic: isHost ? enclitic : null, start: offset });
      offset += part.length;
    });
  }
  return tokens;
}

function splitEnclitic(word) {
  const key = normalizeForm(word);
  if (NEVER_SPLIT.has(key)) return { parts: [word], enclitic: null };
  for (const enc of ENCLITICS) {
    if (key.length > enc.length + 2 && key.endsWith(enc)) {
      const cut = word.length - enc.length;
      return { parts: [word.slice(0, cut), word.slice(cut)], enclitic: enc };
    }
  }
  return { parts: [word], enclitic: null };
}

function push(tokens, { surface, kind, enclitic, start }) {
  tokens.push({
    index: tokens.length,
    surface,
    key: normalizeForm(surface),
    kind,
    enclitic,
    start,
    end: start + surface.length,
  });
}
