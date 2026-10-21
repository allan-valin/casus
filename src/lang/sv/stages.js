/*
 * Swedish roles (2026-10-21), on the shared Romance rules (src/lang/romance.js) like Dutch: case survives only in the
 * pronouns (jag / mig, han / honom, hon / henne, vi / oss, de / dem), the rest is word order. Swedish puts the verb
 * second, so a subject can follow it (Idag läser jag): a subject pronoun keeps its role wherever it stands.
 */
import { makeRoleStage, makeClosedStage, art, cl, prep, pron } from '../romance.js';

const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });
export const roleStage = makeRoleStage({ dative: ['till', 'åt'], unaccusative: /^$/ });

const SUBJECT = { jag: ['1', 'sg'], du: ['2', 'sg'], han: ['3', 'sg'], hon: ['3', 'sg'], vi: ['1', 'pl'], ni: ['2', 'pl'], de: ['3', 'pl'] };
const CLOSED = {
  en: [art('en', 'c', 'sg')], ett: [art('ett', 'n', 'sg')],
  ...Object.fromEntries(Object.entries(SUBJECT).map(([w, [person, number]]) => [w, [pron(w, { person, number })]])),
  mig: [cl('jag', 'obj', null, 'sg')], mej: [cl('jag', 'obj', null, 'sg')], dig: [cl('du', 'obj', null, 'sg')], dej: [cl('du', 'obj', null, 'sg')],
  honom: [cl('han', 'obj', 'm', 'sg')], henne: [cl('hon', 'obj', 'f', 'sg')], oss: [cl('vi', 'obj', null, 'pl')], er: [cl('ni', 'obj', null, 'pl')], dem: [cl('de', 'obj', null, 'pl')],
  till: [prep('till')], åt: [prep('åt')], på: [prep('på')], i: [prep('i')], med: [prep('med')], för: [prep('för')], av: [prep('av')], om: [prep('om')],
  från: [prep('från')], under: [prep('under')], över: [prep('över')], hos: [prep('hos')], vid: [prep('vid')], utan: [prep('utan')], efter: [prep('efter')],
};
export const closedStage = makeClosedStage(CLOSED);

/** a subject pronoun (jag, du, han…) is the subject even after the verb (verb second: Idag läser jag) */
export function subjectPronounStage(blocks) {
  return blocks.map((b) => {
    if (b.pinned || !SUBJECT[b.token.key]) return b;
    return { ...b, candidates: b.candidates.map((c) => (c.analysis.pos === 'pron' ? withReason({ ...c, analysis: { ...c.analysis, case: 'sbj' } }, 'a subject pronoun: the subject, before or after the verb') : c)) };
  });
}
