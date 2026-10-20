/*
 * Portuguese roles (overnight 2026-10-19; Allan: subject, direct and indirect object must show). Portuguese has no cases:
 * the role comes from word order and the few marked words.
 * - an article (o, a, os, as) before a noun or adjective is the article; before a verb it is the object pronoun
 * - lhe/lhes are indirect objects; o/a/os/as/lo/la/no/na as pronouns direct objects
 * - a / para (and ao, à, aos, às, pra, pro) + a noun phrase after the verb is the indirect object
 * - in a clause with one finite verb: the noun phrase before it is the subject, the first one after it without a
 *   preposition the direct object
 * The phrase (article, adjectives, noun) takes its head's role. Never empties a block.
 */
import { makeRoleStage, makeClosedStage, art, cl, prep } from '../romance.js';

export const roleStage = makeRoleStage({
  dative: ['a', 'para', 'ao', 'à', 'aos', 'às', 'pra', 'pro', 'pras', 'pros'],
  unaccusative: /^(cheg|nasc|nasç|morr|acontec|aparec|desaparec|surg|exist|falt|cresc|caiu|caí|cai$|caem|caíram|saiu|saíram|começ|termin|sobr|sumi|sum[iu])/,
});

/* Closed-class words the dictionary tags loosely or not at all: articles that are also object pronouns, the clitics,
 * the preposition contractions. Their readings replace the lexicon's. */
const CLOSED = {
  o: [art('o', 'm', 'sg'), cl('o', 'obj', 'm', 'sg')], a: [art('o', 'f', 'sg'), cl('o', 'obj', 'f', 'sg'), prep('a')],
  os: [art('o', 'm', 'pl'), cl('o', 'obj', 'm', 'pl')], as: [art('o', 'f', 'pl'), cl('o', 'obj', 'f', 'pl')],
  um: [art('um', 'm', 'sg')], uma: [art('um', 'f', 'sg')], uns: [art('um', 'm', 'pl')], umas: [art('um', 'f', 'pl')],
  eu: [{ lemma: 'eu', pos: 'pron', person: '1', number: 'sg' }], tu: [{ lemma: 'tu', pos: 'pron', person: '2', number: 'sg' }],
  você: [{ lemma: 'você', pos: 'pron', person: '3', number: 'sg' }], vocês: [{ lemma: 'você', pos: 'pron', person: '3', number: 'pl' }],
  ele: [{ lemma: 'ele', pos: 'pron', gender: 'm', number: 'sg' }], ela: [{ lemma: 'ele', pos: 'pron', gender: 'f', number: 'sg' }],
  eles: [{ lemma: 'ele', pos: 'pron', gender: 'm', number: 'pl' }], elas: [{ lemma: 'ele', pos: 'pron', gender: 'f', number: 'pl' }],
  nós: [{ lemma: 'nós', pos: 'pron', person: '1', number: 'pl' }],
  me: [cl('me', 'obj')], te: [cl('te', 'obj')], lhe: [cl('lhe', 'iobj', null, 'sg')], lhes: [cl('lhe', 'iobj', null, 'pl')],
  ao: [prep('a')], à: [prep('a')], aos: [prep('a')], às: [prep('a')], pra: [prep('para')], pro: [prep('para')], pros: [prep('para')], pras: [prep('para')],
  do: [prep('de')], da: [prep('de')], dos: [prep('de')], das: [prep('de')], no: [prep('em')], na: [prep('em')], nas: [prep('em')],
  pelo: [prep('por')], pela: [prep('por')], pelos: [prep('por')], pelas: [prep('por')], num: [prep('em')], numa: [prep('em')],
  de: [prep('de')], em: [prep('em')], para: [prep('para')], com: [prep('com')], por: [prep('por')], sem: [prep('sem')],
};
export const closedStage = makeClosedStage(CLOSED);
