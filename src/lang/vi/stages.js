/*
 * Vietnamese (2026-10-21): words are syllables written apart (học sinh "student", Việt Nam), so splitWords joins
 * neighbouring syllables into the longest word the dictionary knows (up to four). No inflection: the colours are the
 * roles from word order (subject – verb – object) on the shared Romance rules, with cho + noun the indirect object.
 */
import { makeRoleStage, makeClosedStage, prep, pron } from '../romance.js';

export const roleStage = makeRoleStage({ dative: ['cho'], unaccusative: /^$/ });

const P = (w, person, number) => [pron(w, { person, number })];
export const closedStage = makeClosedStage({
  tôi: P('tôi', '1', 'sg'), tao: P('tao', '1', 'sg'), mình: P('mình', '1', 'sg'), bạn: P('bạn', '2', 'sg'), mày: P('mày', '2', 'sg'),
  'chúng tôi': P('chúng tôi', '1', 'pl'), 'chúng ta': P('chúng ta', '1', 'pl'), 'các bạn': P('các bạn', '2', 'pl'), họ: P('họ', '3', 'pl'),
  ở: [prep('ở')], với: [prep('với')], từ: [prep('từ')], đến: [prep('đến')], trong: [prep('trong')], trên: [prep('trên')],
  dưới: [prep('dưới')], về: [prep('về')], bằng: [prep('bằng')], của: [prep('của')], tại: [prep('tại')],
});

const MAX = 4;
export async function splitWords(tokens, lexicon) {
  const words = tokens.map((t, i) => [t, i]).filter(([t]) => t.kind === 'word');
  const keys = new Set();
  // runs of words separated by single spaces only
  for (let a = 0; a < words.length; a += 1) {
    let key = words[a][0].key;
    for (let n = 1; n < MAX && a + n < words.length; n += 1) {
      const prev = words[a + n - 1][0];
      const next = words[a + n][0];
      if (words[a + n][1] !== words[a + n - 1][1] + 1 || next.start - prev.end !== 1) break;
      key += ` ${next.key}`;
      keys.add(key);
    }
  }
  if (!keys.size) return tokens;
  const found = await lexicon.lookupAll([...keys]);
  const known = (k) => (found.get(k) ?? []).length > 0;
  const out = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t.kind !== 'word') { out.push(t); continue; }
    let best = 1;
    let key = t.key;
    for (let n = 2; n <= MAX && i + n - 1 < tokens.length; n += 1) {
      const next = tokens[i + n - 1];
      const prev = tokens[i + n - 2];
      if (next.kind !== 'word' || next.start - prev.end !== 1) break;
      key += ` ${next.key}`;
      if (known(key)) best = n;
    }
    if (best === 1) { out.push(t); continue; }
    const last = tokens[i + best - 1];
    out.push({ ...t, surface: tokens.slice(i, i + best).map((x) => x.surface).join(' '), key: tokens.slice(i, i + best).map((x) => x.key).join(' '), end: last.end });
    i += best - 1;
  }
  return out;
}
