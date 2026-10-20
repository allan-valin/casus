/*
 * Italian roles (2026-10-20), on the shared Romance rules (src/lang/romance.js): subject before the verb, the first
 * bare noun phrase after it the direct object, a / al / allo / alla / ai / agli / alle + noun phrase after it the
 * indirect object; lo / la / li / le before a verb are direct object pronouns, gli / le (to him / to her) indirect.
 * (le is both "them, f." and "to her": taken as direct here.)
 */
import { makeRoleStage, makeClosedStage, art, cl, prep, pron } from '../romance.js';

export const roleStage = makeRoleStage({
  dative: ['a', 'ad', 'al', 'allo', 'alla', "all'", 'ai', 'agli', 'alle', 'per'],
  unaccusative: /^(arriv|nasc|nacqu|nat[oaie]|mor|muor|succed|success|accad|compar|scompar|esist|manc|cresc|cad|usc|esc|rest|torn|ven|vien|partit|part)/,
});

const CLOSED = {
  il: [art('il', 'm', 'sg')], lo: [art('il', 'm', 'sg'), cl('lo', 'obj', 'm', 'sg')], la: [art('il', 'f', 'sg'), cl('lo', 'obj', 'f', 'sg')],
  "l'": [art('il', null, 'sg')], i: [art('il', 'm', 'pl')], gli: [art('il', 'm', 'pl'), cl('gli', 'iobj', 'm', 'sg')],
  le: [art('il', 'f', 'pl'), cl('lo', 'obj', 'f', 'pl')], li: [cl('lo', 'obj', 'm', 'pl')],
  un: [art('un', 'm', 'sg')], uno: [art('un', 'm', 'sg')], una: [art('un', 'f', 'sg')], "un'": [art('un', 'f', 'sg')],
  mi: [cl('mi', 'obj')], ti: [cl('ti', 'obj')], ci: [cl('ci', 'obj')], vi: [cl('vi', 'obj')], si: [cl('si', 'obj')],
  a: [prep('a')], ad: [prep('a')], al: [prep('a')], allo: [prep('a')], alla: [prep('a')], ai: [prep('a')], agli: [prep('a')], alle: [prep('a')],
  di: [prep('di')], del: [prep('di')], della: [prep('di')], dei: [prep('di')], degli: [prep('di')], delle: [prep('di')], dello: [prep('di')],
  da: [prep('da')], dal: [prep('da')], dalla: [prep('da')], in: [prep('in')], nel: [prep('in')], nella: [prep('in')], nei: [prep('in')],
  con: [prep('con')], su: [prep('su')], sul: [prep('su')], sulla: [prep('su')], per: [prep('per')], tra: [prep('tra')], fra: [prep('fra')],
  io: [pron('io', { person: '1', number: 'sg' })], tu: [pron('tu', { person: '2', number: 'sg' })], lui: [pron('lui', { gender: 'm', number: 'sg' })],
  lei: [pron('lui', { gender: 'f', number: 'sg' })], noi: [pron('noi', { person: '1', number: 'pl' })], voi: [pron('voi', { person: '2', number: 'pl' })],
  loro: [pron('loro', { number: 'pl' })],
};
export const closedStage = makeClosedStage(CLOSED);
