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
const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });
const isVerb = (b) => b.candidates.length && b.candidates.every((c) => c.analysis.pos === 'verb');
const maybeVerb = (b) => b?.candidates.some((c) => c.analysis.pos === 'verb');
const NOMINAL = new Set(['noun', 'pron', 'adj', 'det', 'num']);
const DATIVE = new Set(['a', 'para', 'ao', 'à', 'aos', 'às', 'pra', 'pro', 'pras', 'pros']);

function setRole(b, role, why) {
  if (b.pinned) return b;
  const keep = b.candidates.filter((c) => NOMINAL.has(c.analysis.pos));
  if (!keep.length) return b;
  return { ...b, candidates: keep.map((c) => withReason({ ...c, analysis: { ...c.analysis, case: role } }, why)) };
}

const isDet = (b) => b?.candidates.length && b.candidates.every((c) => c.analysis.pos === 'det');
const isNominal = (b) => b?.candidates.length && b.candidates.every((c) => ['noun', 'pron'].includes(c.analysis.pos));
// noun or verb: after an article the noun (o livro); right after a noun phrase, with no article of its own, the verb
// (o menino lê)
function nounOrVerb(blocks) {
  return blocks.map((b, i) => {
    if (b.pinned) return b;
    const verbs = b.candidates.filter((c) => c.analysis.pos === 'verb');
    const others = b.candidates.filter((c) => c.analysis.pos !== 'verb');
    if (!verbs.length || !others.length) return b;
    if (isDet(blocks[i - 1])) return { ...b, candidates: others.map((c) => withReason(c, 'after an article: not a verb')) };
    if (isNominal(blocks[i - 1])) return { ...b, candidates: verbs.map((c) => withReason(c, 'after a noun phrase, no article: the verb')) };
    return b;
  });
}

export function roleStage(blocks) {
  let out = nounOrVerb(blocks);
  // article or object pronoun
  out = out.map((b, i) => {
    const next = out[i + 1];
    const art = b.candidates.filter((c) => c.analysis.pos === 'det');
    const cl = b.candidates.filter((c) => c.analysis.clitic);
    if (!art.length || !cl.length || !next) return b;
    if (maybeVerb(next) && !next.candidates.some((c) => ['noun', 'adj'].includes(c.analysis.pos))) return { ...b, candidates: cl.map((c) => withReason(c, 'before a verb: the object pronoun')) };
    if (next.candidates.some((c) => ['noun', 'adj', 'num'].includes(c.analysis.pos))) return { ...b, candidates: art.map((c) => withReason(c, 'before a noun: the article')) };
    return b;
  });
  // marked pronouns
  out = out.map((b) => {
    const cl = b.candidates.find((c) => c.analysis.clitic);
    return cl && b.candidates.every((c) => c.analysis.clitic) ? setRole(b, cl.analysis.clitic, cl.analysis.clitic === 'iobj' ? 'lhe/lhes: the indirect object' : 'the object pronoun') : b;
  });
  const v = out.findIndex(isVerb);
  if (v < 0) return out;
  // phrases: runs of nominal words; a dative preposition before one makes it the indirect object
  const phrases = [];
  for (let i = 0; i < out.length; i += 1) {
    if (i === v || !out[i].candidates.some((c) => NOMINAL.has(c.analysis.pos)) || out[i].candidates.every((c) => c.analysis.clitic)) continue;
    const start = i;
    while (i + 1 < out.length && i + 1 !== v && out[i + 1].candidates.some((c) => NOMINAL.has(c.analysis.pos)) && !out[i + 1].candidates.some((c) => c.analysis.pos === 'prep') && !out[i + 1].candidates.every((c) => c.analysis.clitic)) i += 1;
    phrases.push([start, i]);
  }
  let objectTaken = false;
  for (const [a, z] of phrases) {
    const before = out[a - 1];
    const prep = before && before.candidates.some((c) => c.analysis.pos === 'prep') ? before.token.key : null;
    let role = null;
    let why = '';
    if (prep && DATIVE.has(prep) && a > v) { role = 'iobj'; why = `${before.token.surface} + noun after the verb: the indirect object`; }
    else if (prep) continue;
    else if (z < v) { role = 'sbj'; why = 'before the verb: the subject'; }
    else if (!objectTaken) { role = 'obj'; why = 'after the verb, no preposition: the direct object'; objectTaken = true; }
    if (!role) continue;
    if (prep) out[a - 1] = { ...before, candidates: before.candidates.map((c) => (c.analysis.pos === 'prep' ? withReason({ ...c, analysis: { ...c.analysis, governs: [role], case: role } }, 'marks the indirect object') : c)) };
    for (let k = a; k <= z; k += 1) out[k] = setRole(out[k], role, why);
  }
  return out;
}

/* Closed-class words the dictionary tags loosely or not at all: articles that are also object pronouns, the clitics,
 * the preposition contractions. Their readings replace the lexicon's. */
const art = (lemma, gender, number) => ({ lemma, pos: 'det', gender, number });
const cl = (lemma, role, gender, number) => ({ lemma, pos: 'pron', clitic: role, gender, number });
const prep = (lemma) => ({ lemma, pos: 'prep' });
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
export function closedStage(blocks) {
  return blocks.map((b) => {
    const readings = CLOSED[b.token.key];
    if (!readings || b.pinned) return b;
    return { ...b, candidates: readings.map((analysis) => ({ analysis, reasons: ['a closed-class word (Casus table)'], links: [] })) };
  });
}
