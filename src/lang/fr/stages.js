/*
 * French roles (2026-10-20), on the shared Romance rules (src/lang/romance.js): subject before the verb, the first bare
 * noun phrase after it the direct object, à / au / aux + noun phrase after it the indirect object; le / la / les / l'
 * before a verb are object pronouns, lui / leur indirect ones. Elided words (l', j', qu', d') are their own tokens and
 * are read from the table below.
 */
import { makeRoleStage, makeClosedStage, art, cl, prep, pron } from '../romance.js';

export const roleStage = makeRoleStage({
  dative: ['à', 'au', 'aux', 'pour'],
  // the few verbs that can have their subject after them with nothing before (Arrive le train; mostly literary)
  unaccusative: /^(arriv|vien|venu|naît|naqu|meur|mort|rest|tomb|entr|sort|parti|part$|apparaî|apparu|surv|exist)/,
});

const CLOSED = {
  le: [art('le', 'm', 'sg'), cl('le', 'obj', 'm', 'sg')], la: [art('le', 'f', 'sg'), cl('le', 'obj', 'f', 'sg')],
  les: [art('le', null, 'pl'), cl('le', 'obj', null, 'pl')], l: [art('le', null, 'sg'), cl('le', 'obj', null, 'sg')],
  un: [art('un', 'm', 'sg')], une: [art('un', 'f', 'sg')], des: [art('un', null, 'pl'), prep('de')],
  du: [prep('de')], au: [prep('à')], aux: [prep('à')], à: [prep('à')], de: [prep('de')], d: [prep('de')],
  en: [prep('en'), cl('en', 'obj')], dans: [prep('dans')], pour: [prep('pour')], avec: [prep('avec')], sans: [prep('sans')],
  par: [prep('par')], sur: [prep('sur')], sous: [prep('sous')], chez: [prep('chez')],
  je: [pron('je', { person: '1', number: 'sg' })], j: [pron('je', { person: '1', number: 'sg' })],
  tu: [pron('tu', { person: '2', number: 'sg' })], il: [pron('il', { gender: 'm', number: 'sg' })], elle: [pron('il', { gender: 'f', number: 'sg' })],
  on: [pron('on', { number: 'sg' })], nous: [pron('nous', { person: '1', number: 'pl' })], vous: [pron('vous', { person: '2', number: 'pl' })],
  ils: [pron('il', { gender: 'm', number: 'pl' })], elles: [pron('il', { gender: 'f', number: 'pl' })],
  me: [cl('me', 'obj')], m: [cl('me', 'obj')], te: [cl('te', 'obj')], t: [cl('te', 'obj')], se: [cl('se', 'obj')], s: [cl('se', 'obj'), { lemma: 'si', pos: 'conj' }],
  lui: [cl('lui', 'iobj', null, 'sg')], leur: [cl('lui', 'iobj', null, 'pl'), { lemma: 'leur', pos: 'det' }],
  y: [cl('y', 'iobj')], qu: [{ lemma: 'que', pos: 'conj' }, pron('que')], que: [{ lemma: 'que', pos: 'conj' }, pron('que')],
  n: [{ lemma: 'ne', pos: 'particle' }], ne: [{ lemma: 'ne', pos: 'particle' }], c: [pron('ce')],
  jusqu: [prep('jusque')], lorsqu: [{ lemma: 'lorsque', pos: 'conj' }], puisqu: [{ lemma: 'puisque', pos: 'conj' }],
};
export const closedStage = makeClosedStage(CLOSED);
