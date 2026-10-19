/*
 * Korean writes spaces between phrases (eojeol), with the particles attached: 학교에 "at school". Words are the
 * spaced runs; splitWords cuts a particle off the end when the run itself is not a dictionary word but what comes
 * before the particle is (longest particle first: 에서 before 에).
 */
import { PARTICLES } from './particles.js';

const WORD = /[가-힣ㄱ-ㆎ\p{L}\p{N}]+/gu;
const BY_LENGTH = Object.keys(PARTICLES).sort((a, b) => b.length - a.length);
// the copula after a noun (학생이에요 "is a student", 그거야 "it's that"), longest first; 야 and 예요 follow a vowel
const COPULA = ['이었어요', '였어요', '이었다', '였다', '이에요', '입니다', '이세요', '이니까', '예요', '이야', '이다', '이고', '야'];
// colloquial short forms the dictionary files only as contractions: 거 is 것 "thing"
// and the topic or object particle fused into the last syllable (이건 = 이거는, 그걸 = 그거를)
const ALIAS = { 거: '것', 이건: '이거', 그건: '그거', 저건: '저거', 이걸: '이거', 그걸: '그거', 저걸: '저거', 우린: '우리', 뭘: '뭐' };
export const PRONOUNS = ['저', '나', '너', '우리', '저희', '그', '그녀', '이것', '그것', '저것', '여기', '거기', '저기', '누구', '무엇', '뭐', '당신'];

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
    for (const p of [...BY_LENGTH, ...COPULA]) if (t.key.endsWith(p) && t.key.length > p.length) keys.add(t.key.slice(0, -p.length));
    for (const [short, full] of Object.entries(ALIAS)) if (t.key.startsWith(short)) keys.add(full);
    if (ALIAS[t.key]) keys.add(ALIAS[t.key]);
  }
  const found = await lexicon.lookupAll([...keys]);
  const known0 = (k) => (found.get(k) ?? []).some((a) => a.pos !== 'particle');
  const as = (k) => (!known0(k) && ALIAS[k] && known0(ALIAS[k]) ? ALIAS[k] : k);
  const known = (k) => known0(as(k));
  const nominal = (k) => (found.get(as(k)) ?? []).some((a) => a.pos === 'noun' || a.pos === 'pron');
  const out = [];
  for (const t of tokens) {
    // the common pronouns are split from their particle even where the dictionary lists the whole (저는, 제가…)
    const pronounFirst = PRONOUNS.some((pr) => t.key.startsWith(pr) && t.key.length > pr.length && PARTICLES[t.key.slice(pr.length)] !== undefined);
    // 거 + the copula is 것 + the copula, not some rare noun spelled 거야 (去夜 "last night")
    const aliasFirst = Object.keys(ALIAS).some((sh) => t.key.startsWith(sh) && COPULA.includes(t.key.slice(sh.length)));
    if (t.kind !== 'word' || (known0(t.key) && !pronounFirst && !aliasFirst)) { out.push(t); continue; }
    const p = BY_LENGTH.find((x) => t.key.endsWith(x) && t.key.length > x.length && known(t.key.slice(0, -x.length)));
    const cop = !p && COPULA.find((x) => t.key.endsWith(x) && t.key.length > x.length && nominal(t.key.slice(0, -x.length)));
    if (cop) {
      const cut = t.surface.length - cop.length;
      out.push({ ...t, surface: t.surface.slice(0, cut), key: as(t.key.slice(0, -cop.length)), end: t.start + cut });
      out.push({ surface: cop, kind: 'word', key: cop, start: t.start + cut, end: t.end, enclitic: null, copula: true });
      continue;
    }
    if (!p) { out.push(as(t.key) !== t.key ? { ...t, key: as(t.key) } : t); continue; }
    const cut = t.surface.length - p.length;
    out.push({ ...t, surface: t.surface.slice(0, cut), key: as(t.key.slice(0, -p.length)), end: t.start + cut });
    out.push({ surface: p, kind: 'word', key: p, start: t.start + cut, end: t.end, enclitic: null, particle: true });
  }
  return out;
}
