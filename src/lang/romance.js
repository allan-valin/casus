/*
 * Roles for the Romance languages without cases (Portuguese, French, Spanish): subject, direct and indirect object,
 * read from word order and the few marked words (articles, clitics, the dative preposition). Written for Portuguese
 * (overnight 2026-10-19), shared since 2026-10-20; each language gives its dative prepositions, the verbs that put
 * their subject after them, and its closed-class table.
 */
const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });
const isVerb = (b) => b.candidates.length && b.candidates.every((c) => c.analysis.pos === 'verb');
const maybeVerb = (b) => b?.candidates.some((c) => c.analysis.pos === 'verb');
const NOMINAL = new Set(['noun', 'pron', 'adj', 'det', 'num']);

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

function roleStageWith(blocks, DATIVE, UNACCUSATIVE) {
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
  // an intransitive verb with no noun phrase before it has its subject after it (Chegou o trem)
  // the verb's first reading decides (a homograph entry may be transitive), or the Casus list of verbs that put
  // their subject after them (Chegou o trem, Caiu a chuva, Nasceu uma criança)
  const inverted = !phrases.some(([, z]) => z < v)
    && (out[v].candidates[0]?.analysis.valency === 'intr' || UNACCUSATIVE.test(out[v].token.key ?? ''));
  let subjectTaken = false;
  for (const [a, z] of phrases) {
    const before = out[a - 1];
    const prep = before && before.candidates.some((c) => c.analysis.pos === 'prep') ? before.token.key : null;
    let role = null;
    let why = '';
    if (prep && DATIVE.has(prep) && a > v) { role = 'iobj'; why = `${before.token.surface} + noun after the verb: the indirect object`; }
    else if (prep) continue;
    else if (z < v) { role = 'sbj'; why = 'before the verb: the subject'; }
    else if (inverted && !subjectTaken) { role = 'sbj'; why = 'after an intransitive verb with nothing before it: the subject'; subjectTaken = true; }
    else if (!objectTaken) { role = 'obj'; why = 'after the verb, no preposition: the direct object'; objectTaken = true; }
    if (!role) continue;
    if (prep) out[a - 1] = { ...before, candidates: before.candidates.map((c) => (c.analysis.pos === 'prep' ? withReason({ ...c, analysis: { ...c.analysis, governs: [role], case: role } }, 'marks the indirect object') : c)) };
    for (let k = a; k <= z; k += 1) out[k] = setRole(out[k], role, why);
  }
  return out;
}


export function makeRoleStage({ dative, unaccusative }) {
  const DATIVE = new Set(dative);
  return (blocks) => roleStageWith(blocks, DATIVE, unaccusative);
}

/* Closed-class words the dictionary tags loosely or not at all: their readings replace the lexicon's. */
export const art = (lemma, gender, number) => ({ lemma, pos: 'det', gender, number });
export const cl = (lemma, role, gender, number) => ({ lemma, pos: 'pron', clitic: role, gender, number });
export const prep = (lemma) => ({ lemma, pos: 'prep' });
export const pron = (lemma, extra = {}) => ({ lemma, pos: 'pron', ...extra });
export function makeClosedStage(CLOSED) {
  return (blocks) => blocks.map((b) => {
    const readings = CLOSED[b.token.key];
    if (!readings || b.pinned) return b;
    return { ...b, candidates: readings.map((analysis) => ({ analysis, reasons: ['a closed-class word (Casus table)'], links: [] })) };
  });
}
