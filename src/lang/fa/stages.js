/*
 * Persian roles (2026-10-21): no cases; the colours are the roles. Persian puts the verb last (subject – object – verb),
 * so word order alone cannot tell subject from object: را after a noun phrase marks the definite direct object,
 * به + noun the indirect object, and the first unmarked noun phrase before the verb is the subject.
 */
import { makeClosedStage, prep, pron } from '../romance.js';

const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });
const NOMINAL = new Set(['noun', 'pron', 'adj', 'num', 'det']);
const nominal = (b) => b?.candidates.some((c) => NOMINAL.has(c.analysis.pos));
function setRole(b, role, why) {
  if (b.pinned) return b;
  const keep = b.candidates.filter((c) => NOMINAL.has(c.analysis.pos));
  return keep.length ? { ...b, candidates: keep.map((c) => withReason({ ...c, analysis: { ...c.analysis, case: role } }, why)) } : b;
}

const P = (w, person, number) => [pron(w, { person, number })];
export const closedStage = makeClosedStage({
  من: P('من', '1', 'sg'), تو: P('تو', '2', 'sg'), او: P('او', '3', 'sg'), ما: P('ما', '1', 'pl'), شما: P('شما', '2', 'pl'), آنها: P('آنها', '3', 'pl'), ایشان: P('ایشان', '3', 'pl'),
  '-ش': [{ lemma: 'او', pos: 'det', person: '3', number: 'sg' }], '-م': [{ lemma: 'من', pos: 'det', person: '1', number: 'sg' }], '-ت': [{ lemma: 'تو', pos: 'det', person: '2', number: 'sg' }],
  '-مان': [{ lemma: 'ما', pos: 'det', person: '1', number: 'pl' }], '-تان': [{ lemma: 'شما', pos: 'det', person: '2', number: 'pl' }], '-شان': [{ lemma: 'آنها', pos: 'det', person: '3', number: 'pl' }],
  را: [{ lemma: 'را', pos: 'particle' }], رو: [{ lemma: 'را', pos: 'particle' }],
  به: [prep('به')], از: [prep('از')], در: [prep('در')], با: [prep('با')], برای: [prep('برای')], تا: [prep('تا')], بی: [prep('بی')],
});

export function roleStage(blocks) {
  const out = blocks.slice();
  // Persian puts the verb last: the clause's last word that can be a verb is the verb
  let verb = -1;
  for (let k = out.length - 1; k >= 0; k -= 1) if (out[k].candidates.some((c) => c.analysis.pos === 'verb')) { verb = k; break; }
  if (verb >= 0 && !out[verb].pinned) out[verb] = { ...out[verb], candidates: out[verb].candidates.filter((c) => c.analysis.pos === 'verb').map((c) => withReason(c, 'the last word that can be a verb: the verb (verb last)')) };
  let subjectTaken = false;
  for (let i = 0; i < out.length; i += 1) {
    if (i === verb || !nominal(out[i])) continue;
    let z = i;
    const isPron = (b) => b.candidates.length && b.candidates.every((c) => c.analysis.pos === 'pron');
    while (z + 1 < out.length && z + 1 !== verb && nominal(out[z + 1]) && out[z + 1].token.key !== 'را' && !isPron(out[z]) && !isPron(out[z + 1]) && !out[z].token.key.startsWith('-')) z += 1;
    const before = out[i - 1]?.token.key;
    const after = out[z + 1]?.token.key;
    let role = null;
    let why = '';
    if (after === 'را') { role = 'obj'; why = 'before را: the definite direct object'; }
    else if (before === 'به') { role = 'iobj'; why = 'after به: the indirect object'; }
    else if (out[i - 1] && out[i - 1].candidates.some((c) => c.analysis.pos === 'prep')) role = null;
    else if (!subjectTaken && (verb < 0 || i < verb)) { role = 'sbj'; why = 'the first noun phrase before the verb: the subject'; subjectTaken = true; }
    else if (subjectTaken && verb === z + 1) { role = 'obj'; why = 'right before the verb, without را: the (indefinite) direct object'; }
    if (role) for (let k = i; k <= z; k += 1) out[k] = setRole(out[k], role, why);
    i = z;
  }
  return out;
}

// pronoun endings written onto a noun (دوستش his friend, کتابم my book), read apart when the whole word is unknown
const ENDINGS = ['شان', 'تان', 'مان', 'ش', 'م', 'ت'];
export async function splitWords(tokens, lexicon) {
  const words = tokens.filter((t) => t.kind === 'word');
  const keys = new Set(words.map((t) => t.key));
  for (const t of words) for (const e of ENDINGS) if (t.key.endsWith(e) && t.key.length > e.length + 1) keys.add(t.key.slice(0, -e.length));
  const found = await lexicon.lookupAll([...keys]);
  const known = (k) => (found.get(k) ?? []).length > 0;
  const out = [];
  for (const t of tokens) {
    if (t.kind !== 'word' || known(t.key)) { out.push(t); continue; }
    const e = ENDINGS.find((x) => t.key.endsWith(x) && t.key.length > x.length + 1 && known(t.key.slice(0, -x.length)));
    if (!e) { out.push(t); continue; }
    const cut = t.surface.length - e.length;
    out.push({ ...t, surface: t.surface.slice(0, cut), key: t.key.slice(0, -e.length), end: t.start + cut });
    out.push({ surface: t.surface.slice(cut), kind: 'word', key: `-${e}`, start: t.start + cut, end: t.end, enclitic: null });
  }
  return out;
}
