/* Greek words and punctuation (docs/languages/grc.md §7). An elided word keeps its apostrophe
 * (’ ' ʼ ᾽ ‘) in the surface and is looked up as its full form through ELISIONS; crasis is left whole;
 * enclitics are separate words in modern editions. Token shape = Latin's (src/lib/tokenize.js). */
import { normalizeGrc } from './normalize.js';

const APOSTROPHES = '’\'ʼ᾽‘';
const ELIDED = {
  'ἀλλ': 'ἀλλά', 'δ': 'δέ', 'τ': 'τε', 'γ': 'γε', 'οὐδ': 'οὐδέ', 'μηδ': 'μηδέ', 'ἐπ': 'ἐπί', 'ἐφ': 'ἐπί',
  'ἀπ': 'ἀπό', 'ἀφ': 'ἀπό', 'ὑπ': 'ὑπό', 'ὑφ': 'ὑπό', 'κατ': 'κατά', 'καθ': 'κατά', 'μετ': 'μετά', 'μεθ': 'μετά',
  'παρ': 'παρά', 'δι': 'διά', 'ἀντ': 'ἀντί', 'ἀνθ': 'ἀντί', 'ἀμφ': 'ἀμφί', 'ἐπειδ': 'ἐπειδή', 'ταῦτ': 'ταῦτα',
  'μυρί': 'μυρία', 'ἄλγε': 'ἄλγεα', 'πάντ': 'πάντα', 'οὔτ': 'οὔτε', 'μήτ': 'μήτε', 'εἶτ': 'εἶτα', 'ἔπειτ': 'ἔπειτα',
};
export const ELISIONS = Object.fromEntries(Object.entries(ELIDED).map(([k, v]) => [normalizeGrc(k), normalizeGrc(v)]));

const WORD = new RegExp(`(\\p{L}[\\p{L}\\p{M}]*[${APOSTROPHES}]?)|([^\\s\\p{L}]+)`, 'gu');

export function tokenize(sentenceText) {
  const tokens = [];
  let clause = 0;
  for (let m = WORD.exec(sentenceText); m; m = WORD.exec(sentenceText)) {
    const [raw, word] = m;
    if (!word) { push(tokens, raw, 'punct', normalizeGrc(raw), m.index); if (/[,;:·\u0387]/.test(raw)) clause += 1; continue; }
    const bare = word.replace(new RegExp(`[${APOSTROPHES}]$`), '');
    const key = bare !== word ? (ELISIONS[normalizeGrc(bare)] ?? normalizeGrc(bare)) : normalizeGrc(word);
    push(tokens, word, 'word', key, m.index);
    tokens[tokens.length - 1].clause = clause;
  }
  return tokens;
}

function push(tokens, surface, kind, key, start) {
  tokens.push({ index: tokens.length, surface, key, kind, enclitic: null, start, end: start + surface.length });
}
