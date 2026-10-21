/*
 * Swahili (2026-10-21): no cases; the colours are the roles from word order (subject – verb – object) on the shared
 * Romance rules. The verb carries its subject, tense and object as prefixes (ni-li-ki-soma "I read it"), which the
 * dictionary's tables list as whole words; kwa + noun is read as the indirect object only by the reader's eye, so no
 * dative preposition is set.
 */
import { makeRoleStage, makeClosedStage, prep, pron } from '../romance.js';

export const roleStage = makeRoleStage({ dative: [], unaccusative: /^$/ });

const P = (w, person, number) => [pron(w, { person, number })];
export const closedStage = makeClosedStage({
  mimi: P('mimi', '1', 'sg'), wewe: P('wewe', '2', 'sg'), yeye: P('yeye', '3', 'sg'),
  sisi: P('sisi', '1', 'pl'), ninyi: P('ninyi', '2', 'pl'), nyinyi: P('ninyi', '2', 'pl'), wao: P('wao', '3', 'pl'),
  katika: [prep('katika')], kwa: [prep('kwa')], kutoka: [prep('kutoka')], hadi: [prep('hadi')], mpaka: [prep('mpaka')], kuhusu: [prep('kuhusu')],
});

// object prefixes (a-li-ni-pa "he gave me"): the dictionary lists the verb without them, so an unknown word of the
// shape subject + tense + object + stem is looked up without its object prefix
const SHAPE = /^(ni|u|a|tu|m|mu|wa|ki|vi|li|ya|i|zi|ku|pa)(na|li|ta|me|ki|nge|ngali|ka|ja|si|hu)(ni|ku|m|mw|tu|wa|ki|vi|li|ya|i|zi|u|pa|ji)(.{2,})$/;
export const withoutObject = (key) => { const m = key.match(SHAPE); return m ? m[1] + m[2] + m[4] : null; };
export async function splitWords(tokens, lexicon) {
  const keys = new Set();
  for (const t of tokens) if (t.kind === 'word') { keys.add(t.key); const k = withoutObject(t.key); if (k) keys.add(k); }
  const found = await lexicon.lookupAll([...keys]);
  const known = (k) => (found.get(k) ?? []).length > 0;
  return tokens.map((t) => {
    if (t.kind !== 'word' || known(t.key)) return t;
    const k = withoutObject(t.key);
    return k && known(k) ? { ...t, key: k } : t;
  });
}
