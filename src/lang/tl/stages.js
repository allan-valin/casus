/*
 * Tagalog roles (2026-10-21): no cases, but every noun phrase is introduced by a marker that says its role, and the
 * colours follow the markers — ang / si (and the ang-pronouns ako, ikaw, siya…) the topic, which the verb's focus
 * affix points at; ng / ni (and ko, mo, niya…) the non-topic actor or object; sa / kay (and akin, iyo…) the
 * oblique: place, goal, the indirect object.
 */
import { makeClosedStage, prep, pron } from '../romance.js';

const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });
const MARK = { ang: 'top', si: 'top', ng: 'ng', ni: 'ng', sa: 'obl', kay: 'obl', ang_mga: 'top', sina: 'top', nina: 'ng', kina: 'obl' };
const WHY = { top: 'after ang / si: the topic (what the verb focuses on)', ng: 'after ng / ni: the non-topic actor or object', obl: 'after sa / kay: the oblique (place, goal, indirect object)' };
const NOMINAL = new Set(['noun', 'adj', 'num', 'det']);

const P = (w, person, number, c) => [{ ...pron(w, { person, number }), case: c }];
export const closedStage = makeClosedStage({
  ako: P('ako', '1', 'sg', 'top'), ikaw: P('ikaw', '2', 'sg', 'top'), ka: P('ikaw', '2', 'sg', 'top'), siya: P('siya', '3', 'sg', 'top'),
  kami: P('kami', '1', 'pl', 'top'), tayo: P('tayo', '1', 'pl', 'top'), kayo: P('kayo', '2', 'pl', 'top'), sila: P('sila', '3', 'pl', 'top'),
  ko: P('ako', '1', 'sg', 'ng'), mo: P('ikaw', '2', 'sg', 'ng'), niya: P('siya', '3', 'sg', 'ng'), namin: P('kami', '1', 'pl', 'ng'),
  natin: P('tayo', '1', 'pl', 'ng'), ninyo: P('kayo', '2', 'pl', 'ng'), nila: P('sila', '3', 'pl', 'ng'),
  akin: P('ako', '1', 'sg', 'obl'), iyo: P('ikaw', '2', 'sg', 'obl'), kaniya: P('siya', '3', 'sg', 'obl'), kanya: P('siya', '3', 'sg', 'obl'),
  ang: [{ lemma: 'ang', pos: 'particle' }], ng: [{ lemma: 'ng', pos: 'particle' }], sa: [prep('sa')], si: [{ lemma: 'si', pos: 'particle' }],
  ni: [{ lemma: 'ni', pos: 'particle' }], kay: [prep('kay')], sina: [{ lemma: 'sina', pos: 'particle' }], nina: [{ lemma: 'nina', pos: 'particle' }],
  '-ng': [{ lemma: 'na', pos: 'particle' }], kina: [prep('kina')], mga: [{ lemma: 'mga', pos: 'particle' }], na: [{ lemma: 'na', pos: 'particle' }], ay: [{ lemma: 'ay', pos: 'particle' }],
});

export function roleStage(blocks) {
  const out = blocks.slice();
  for (let i = 0; i < out.length; i += 1) {
    const role = MARK[out[i].token.key];
    if (!role) continue;
    let k = i + 1;
    if (out[k]?.token.key === 'mga') k += 1;
    for (; k < out.length; k += 1) {
      const b = out[k];
      if (MARK[b.token.key] || b.token.kind === 'punct') break;
      if (b.pinned || !b.candidates.some((c) => NOMINAL.has(c.analysis.pos))) break;
      const keep = b.candidates.filter((c) => NOMINAL.has(c.analysis.pos));
      out[k] = { ...b, candidates: keep.map((c) => withReason({ ...c, analysis: { ...c.analysis, case: role } }, WHY[role])) };
      if (!['na', '-ng'].includes(out[k + 1]?.token.key) || MARK[out[k + 1]?.token.key]) break;
      k += 1;   // linker na / -ng joins a modifier to its noun (bahay na malaki)
    }
  }
  return out;
}

// the linker -ng written onto a word ending in a vowel (wikang Tagalog, kanyang salita): read apart when the whole
// word is unknown; -n- words (bayan → bayang) drop the n
export const linkerBase = (key) => (/[aeiou]ng$/.test(key) ? [key.slice(0, -2), key.slice(0, -1)] : []);
export async function splitWords(tokens, lexicon) {
  const keys = new Set();
  for (const t of tokens) if (t.kind === 'word') { keys.add(t.key); for (const k of linkerBase(t.key)) keys.add(k); }
  const found = await lexicon.lookupAll([...keys]);
  const known = (k) => (found.get(k) ?? []).length > 0;
  const out = [];
  for (const t of tokens) {
    if (t.kind !== 'word' || known(t.key)) { out.push(t); continue; }
    const base = linkerBase(t.key).find(known);
    if (!base) { out.push(t); continue; }
    const cut = t.surface.length - 2;
    out.push({ ...t, key: base, surface: t.surface.slice(0, cut), end: t.start + cut });
    out.push({ surface: t.surface.slice(cut), kind: 'word', key: '-ng', start: t.start + cut, end: t.end, enclitic: null });
  }
  return out;
}
