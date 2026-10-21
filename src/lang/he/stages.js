/*
 * Hebrew roles (2026-10-21), on the shared Romance rules (src/lang/romance.js): Hebrew has no cases; the colours are
 * the roles. A noun phrase before the verb is the subject, the first after it the direct object, ל / אל + noun the
 * indirect object, and את before a definite noun marks the direct object wherever it stands. The prefixes split off
 * by tokenize.js and the common closed-class words take their readings from the table below.
 */
import { makeRoleStage, makeClosedStage, art, prep, pron } from '../romance.js';

const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });
const conj = (lemma) => ({ lemma, pos: 'conj' });

export const roleStage = makeRoleStage({ dative: ['ל', 'אל'], unaccusative: /^$/ });

const CLOSED = {
  ו: [conj('ו')], ש: [conj('ש')], כש: [conj('כש')], ה: [art('ה', null, null)],
  ב: [prep('ב')], כ: [prep('כ')], ל: [prep('ל')], מ: [prep('מ')],
  של: [prep('של')], עם: [prep('עם')], על: [prep('על')], אל: [prep('אל')], מן: [prep('מן')], בין: [prep('בין')], אחרי: [prep('אחרי')], לפני: [prep('לפני')],
  את: [prep('את'), pron('את', { person: '2', number: 'sg', gender: 'f' })],
  אני: [pron('אני', { person: '1', number: 'sg' })], אתה: [pron('אתה', { person: '2', number: 'sg', gender: 'm' })],
  הוא: [pron('הוא', { person: '3', number: 'sg', gender: 'm' })], היא: [pron('היא', { person: '3', number: 'sg', gender: 'f' })],
  אנחנו: [pron('אנחנו', { person: '1', number: 'pl' })], אתם: [pron('אתם', { person: '2', number: 'pl', gender: 'm' })],
  אתן: [pron('אתן', { person: '2', number: 'pl', gender: 'f' })], הם: [pron('הם', { person: '3', number: 'pl', gender: 'm' })], הן: [pron('הן', { person: '3', number: 'pl', gender: 'f' })],
  לי: [pron('אני', { person: '1', number: 'sg', clitic: 'iobj' })], לך: [pron('אתה', { person: '2', number: 'sg', clitic: 'iobj' })],
  לו: [pron('הוא', { person: '3', number: 'sg', gender: 'm', clitic: 'iobj' })], לה: [pron('היא', { person: '3', number: 'sg', gender: 'f', clitic: 'iobj' })],
  לנו: [pron('אנחנו', { person: '1', number: 'pl', clitic: 'iobj' })], לכם: [pron('אתם', { person: '2', number: 'pl', clitic: 'iobj' })], להם: [pron('הם', { person: '3', number: 'pl', clitic: 'iobj' })],
  אותי: [pron('אני', { person: '1', number: 'sg', clitic: 'obj' })], אותך: [pron('אתה', { person: '2', number: 'sg', clitic: 'obj' })],
  אותו: [pron('הוא', { person: '3', number: 'sg', gender: 'm', clitic: 'obj' })], אותה: [pron('היא', { person: '3', number: 'sg', gender: 'f', clitic: 'obj' })],
  אותנו: [pron('אנחנו', { person: '1', number: 'pl', clitic: 'obj' })], אותם: [pron('הם', { person: '3', number: 'pl', clitic: 'obj' })],
  שלי: [{ lemma: 'של', pos: 'det', person: '1', number: 'sg' }], שלך: [{ lemma: 'של', pos: 'det', person: '2', number: 'sg' }],
  שלו: [{ lemma: 'של', pos: 'det', person: '3', number: 'sg', gender: 'm' }], שלה: [{ lemma: 'של', pos: 'det', person: '3', number: 'sg', gender: 'f' }],
  שלנו: [{ lemma: 'של', pos: 'det', person: '1', number: 'pl' }], שלכם: [{ lemma: 'של', pos: 'det', person: '2', number: 'pl' }], שלהם: [{ lemma: 'של', pos: 'det', person: '3', number: 'pl' }],
  כי: [conj('כי')], אם: [conj('אם')], או: [conj('או')], אבל: [conj('אבל')], גם: [{ lemma: 'גם', pos: 'adv' }], לא: [{ lemma: 'לא', pos: 'adv' }],
};
export const closedStage = makeClosedStage(CLOSED);

const NOMINAL = new Set(['noun', 'pron', 'adj', 'num']);
/** את before a noun phrase: the definite direct object marker; the noun phrase is the object */
export function atStage(blocks) {
  const out = blocks.slice();
  for (let i = 0; i < out.length - 1; i += 1) {
    if (out[i].token.key !== 'את' || out[i].pinned) continue;
    const next = out[i + 1];
    if (!next.candidates.some((c) => NOMINAL.has(c.analysis.pos) || c.analysis.pos === 'det')) continue;
    out[i] = { ...out[i], candidates: out[i].candidates.filter((c) => c.analysis.pos === 'prep').map((c) => withReason({ ...c, analysis: { ...c.analysis, governs: ['obj'], case: 'obj' } }, 'את before a noun: the direct-object marker')) };
    for (let k = i + 1; k < out.length; k += 1) {
      const b = out[k];
      const keep = b.candidates.filter((c) => NOMINAL.has(c.analysis.pos) || c.analysis.pos === 'det');
      if (!keep.length || b.pinned) break;
      out[k] = { ...b, candidates: keep.map((c) => withReason({ ...c, analysis: { ...c.analysis, ...(c.analysis.pos === 'det' ? {} : { case: 'obj' }) } }, 'after את: the direct object')) };
      if (keep.every((c) => c.analysis.pos !== 'det') && !(out[k + 1]?.candidates.every((c) => ['adj', 'det'].includes(c.analysis.pos)))) break;
    }
  }
  return out;
}
