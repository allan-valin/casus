/*
 * Korean writes spaces between phrases (eojeol), with the particles attached: 학교에 "at school". Words are the
 * spaced runs; splitWords cuts a particle off the end when the run itself is not a dictionary word but what comes
 * before the particle is (longest particle first: 에서 before 에).
 */
import { PARTICLES } from './particles.js';

const WORD = /[가-힣ㄱ-ㆎ\p{L}\p{N}]+/gu;
const BY_LENGTH = Object.keys(PARTICLES).sort((a, b) => b.length - a.length);
const PRONOUNS = ['저', '나', '너', '우리', '저희', '그', '그녀', '이것', '그것', '저것', '여기', '거기', '저기', '누구', '무엇', '뭐', '당신'];

export function tokenize(sentenceText) {
  const tokens = [];
  let at = 0;
  const punct = (from, to) => { for (const m of sentenceText.slice(from, to).matchAll(/\S+/g)) tokens.push({ surface: m[0], kind: 'punct', key: m[0], start: from + m.index, end: from + m.index + m[0].length, enclitic: null }); };
  for (const m of sentenceText.matchAll(WORD)) {
    if (m.index > at) punct(at, m.index);
    tokens.push({ surface: m[0], kind: 'word', key: m[0], start: m.index, end: m.index + m[0].length, enclitic: null });
    at = m.index + m[0].length;
  }
  if (at < sentenceText.length) punct(at, sentenceText.length);
  return tokens;
}

export async function splitWords(tokens, lexicon) {
  const keys = new Set();
  for (const t of tokens) {
    if (t.kind !== 'word') continue;
    keys.add(t.key);
    for (const p of BY_LENGTH) if (t.key.endsWith(p) && t.key.length > p.length) keys.add(t.key.slice(0, -p.length));
  }
  const found = await lexicon.lookupAll([...keys]);
  const known = (k) => (found.get(k) ?? []).some((a) => a.pos !== 'particle');
  const out = [];
  for (const t of tokens) {
    // the common pronouns are split from their particle even where the dictionary lists the whole (저는, 제가…)
    const pronounFirst = PRONOUNS.some((pr) => t.key.startsWith(pr) && t.key.length > pr.length && PARTICLES[t.key.slice(pr.length)] !== undefined);
    if (t.kind !== 'word' || (known(t.key) && !pronounFirst)) { out.push(t); continue; }
    const p = BY_LENGTH.find((x) => t.key.endsWith(x) && t.key.length > x.length && known(t.key.slice(0, -x.length)));
    if (!p) { out.push(t); continue; }
    const cut = t.surface.length - p.length;
    out.push({ ...t, surface: t.surface.slice(0, cut), key: t.key.slice(0, -p.length), end: t.start + cut });
    out.push({ surface: p, kind: 'word', key: p, start: t.start + cut, end: t.end, enclitic: null, particle: true });
  }
  return out;
}
