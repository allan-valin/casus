/*
 * Spanish roles (2026-10-20), on the shared Romance rules (src/lang/romance.js): subject before the verb, the first
 * bare noun phrase after it the direct object, a / al / para + noun phrase after it the indirect object; lo / la /
 * los / las before a verb are direct object pronouns, le / les indirect ones. (The "personal a" before a person who is
 * the direct object — Veo a Juan — is read as indirect: not yet told apart.)
 */
import { makeRoleStage, makeClosedStage, art, cl, prep, pron } from '../romance.js';

export const roleStage = makeRoleStage({
  dative: ['a', 'al', 'para'],
  unaccusative: /^(lleg|nac|naci|muer|muri|pas[óa]|ocurr|aparec|desaparec|surg|exist|falt|crec|ca[eíy]|sal[ei]|sali|empez|empiez|termin|sobr|qued)/,
});

const CLOSED = {
  el: [art('el', 'm', 'sg')], la: [art('el', 'f', 'sg'), cl('lo', 'obj', 'f', 'sg')], los: [art('el', 'm', 'pl'), cl('lo', 'obj', 'm', 'pl')],
  las: [art('el', 'f', 'pl'), cl('lo', 'obj', 'f', 'pl')], lo: [cl('lo', 'obj', 'm', 'sg'), art('lo', 'n', 'sg')],
  un: [art('un', 'm', 'sg')], una: [art('un', 'f', 'sg')], unos: [art('un', 'm', 'pl')], unas: [art('un', 'f', 'pl')],
  le: [cl('le', 'iobj', null, 'sg')], les: [cl('le', 'iobj', null, 'pl')], me: [cl('me', 'obj')], te: [cl('te', 'obj')],
  se: [cl('se', 'obj')], nos: [cl('nos', 'obj')], os: [cl('os', 'obj')],
  al: [prep('a')], a: [prep('a')], del: [prep('de')], de: [prep('de')], en: [prep('en')], para: [prep('para')], por: [prep('por')],
  con: [prep('con')], sin: [prep('sin')],
  yo: [pron('yo', { person: '1', number: 'sg' })], tú: [pron('tú', { person: '2', number: 'sg' })], él: [pron('él', { gender: 'm', number: 'sg' })],
  ella: [pron('él', { gender: 'f', number: 'sg' })], usted: [pron('usted', { number: 'sg' })], nosotros: [pron('nosotros', { person: '1', number: 'pl' })],
  vosotros: [pron('vosotros', { person: '2', number: 'pl' })], ellos: [pron('él', { gender: 'm', number: 'pl' })], ellas: [pron('él', { gender: 'f', number: 'pl' })],
  ustedes: [pron('usted', { number: 'pl' })],
};
export const closedStage = makeClosedStage(CLOSED);
