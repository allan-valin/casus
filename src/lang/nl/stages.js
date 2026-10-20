/*
 * Dutch roles (2026-10-20), on the shared Romance rules (src/lang/romance.js): Dutch marks case only on pronouns
 * (ik / mij, jij / jou, hij / hem, zij / haar, wij / ons, zij / hen, hun), so those come from the table by their form;
 * the rest is word order — the noun phrase before the verb the subject, the first after it the direct object, aan /
 * voor + noun phrase the indirect object. (Not yet: verb-second inversion — Gisteren zag ik hem — and the verb at the
 * end of a subordinate clause.)
 */
import { makeRoleStage, makeClosedStage, art, cl, prep, pron } from '../romance.js';

export const roleStage = makeRoleStage({ dative: ['aan', 'voor'], unaccusative: /^$/ });

const CLOSED = {
  de: [art('de', null, null)], het: [art('het', 'n', 'sg')], een: [art('een', null, 'sg')],
  ik: [pron('ik', { person: '1', number: 'sg' })], jij: [pron('jij', { person: '2', number: 'sg' })], je: [pron('jij', { person: '2', number: 'sg' })],
  hij: [pron('hij', { gender: 'm', number: 'sg' })], wij: [pron('wij', { person: '1', number: 'pl' })], we: [pron('wij', { person: '1', number: 'pl' })],
  jullie: [pron('jullie', { person: '2', number: 'pl' })], u: [pron('u', { person: '2' })],
  mij: [cl('ik', 'obj', null, 'sg')], me: [cl('ik', 'obj', null, 'sg')], jou: [cl('jij', 'obj', null, 'sg')], hem: [cl('hij', 'obj', 'm', 'sg')],
  ons: [cl('wij', 'obj', null, 'pl')], hen: [cl('zij', 'obj', null, 'pl')], hun: [cl('zij', 'iobj', null, 'pl')],
  aan: [prep('aan')], voor: [prep('voor')], van: [prep('van')], in: [prep('in')], op: [prep('op')], met: [prep('met')], naar: [prep('naar')],
  bij: [prep('bij')], uit: [prep('uit')], over: [prep('over')], om: [prep('om')], door: [prep('door')], tot: [prep('tot')],
};
export const closedStage = makeClosedStage(CLOSED);
