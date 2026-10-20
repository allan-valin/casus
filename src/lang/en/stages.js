/*
 * English roles (2026-10-20), on the shared Romance rules (src/lang/romance.js): English marks case only on pronouns
 * (I / me, he / him, she / her, we / us, they / them, who / whom), so those come from the table by their form; the rest
 * is word order — the noun phrase before the verb the subject, the first one after it the direct object, to + noun
 * phrase after it the indirect object. (Not yet: the double object without to — gave John the book — and to + place.)
 */
import { makeRoleStage, makeClosedStage, art, cl, prep, pron } from '../romance.js';

export const roleStage = makeRoleStage({ dative: ['to'], unaccusative: /^$/ });

const CLOSED = {
  the: [art('the', null, null)], a: [art('a', null, 'sg')], an: [art('a', null, 'sg')],
  i: [pron('I', { person: '1', number: 'sg' })], he: [pron('he', { gender: 'm', number: 'sg' })], she: [pron('he', { gender: 'f', number: 'sg' })],
  we: [pron('we', { person: '1', number: 'pl' })], they: [pron('they', { number: 'pl' })],
  me: [cl('I', 'obj', null, 'sg')], him: [cl('he', 'obj', 'm', 'sg')], us: [cl('we', 'obj', null, 'pl')], them: [cl('they', 'obj', null, 'pl')],
  whom: [cl('who', 'obj')],
  to: [prep('to')], of: [prep('of')], in: [prep('in')], on: [prep('on')], at: [prep('at')], for: [prep('for')], with: [prep('with')],
  from: [prep('from')], by: [prep('by')], about: [prep('about')],
};
export const closedStage = makeClosedStage(CLOSED);
