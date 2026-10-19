/* Korean: a particle split off a word gives the word its role (topic, subject, object…) on the case hues and glues to
 * it, as in Japanese; the particle keeps only its particle reading. */
import { PARTICLES } from './particles.js';

const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });
const NOMINAL = new Set(['noun', 'pron', 'num']);
import { PRONOUNS } from './tokenize.js';

export function particleStage(blocks) {
  const out = blocks.slice();
  for (let i = 1; i < out.length; i += 1) {
    const p = out[i];
    if (!p.token.particle && !(p.token.surface in PARTICLES && out[i - 1].token.end === p.token.start)) continue;
    const parts = p.candidates.filter((c) => c.analysis.pos === 'particle');
    if (!parts.length) continue;
    const role = PARTICLES[p.token.surface];
    const w = out[i - 1];
    const link = { kind: 'expression', index: w.token.index, contiguous: true };
    out[i] = { ...p, candidates: parts.map((c) => withReason({ ...c, analysis: { ...c.analysis, ...(role ? { governs: [role] } : {}) }, links: [...(c.links ?? []), link] }, role ? `marks ${w.token.surface} as ${role}` : 'particle')) };
    if (role && w.candidates.some((c) => NOMINAL.has(c.analysis.pos))) {
      out[i - 1] = { ...w, candidates: w.candidates.filter((c) => NOMINAL.has(c.analysis.pos)).map((c) => withReason({ ...c, analysis: { ...c.analysis, case: role }, links: [...(c.links ?? []), link] }, `particle ${p.token.surface}: ${role}`)) };
    }
  }
  return out;
}

/* the sentence ends in its verb (Korean is verb-final): the last word keeps its verb readings */
export function finalVerbStage(blocks) {
  const i = blocks.length - 1;
  if (i < 0) return blocks;
  const b = blocks[i];
  const verbs = b.candidates.filter((c) => c.analysis.pos === 'verb' || c.analysis.pos === 'adj');
  if (!verbs.length || verbs.length === b.candidates.length || b.pinned) return blocks;
  const out = blocks.slice();
  out[i] = { ...b, candidates: verbs.map((c) => withReason(c, 'the sentence ends in its verb')) };
  return out;
}

/* the polite endings sound the same for statement, question, command and "let's" (가요): the sentence's last mark
 * decides — . a statement, ? a question, ! a command or "let's" */
export function sentenceTypeStage(blocks) {
  const i = blocks.length - 1;
  const b = blocks[i];
  if (!b || b.pinned) return blocks;
  const mark = (b.token.trail ?? '').trim().slice(-1);
  const kind = (f) => (/ q$/.test(f) ? 'q' : / (imp|let)$/.test(f) ? 'cmd' : 'stmt');
  const want = mark === '?' ? 'q' : mark === '!' ? 'cmd' : mark === '.' ? 'stmt' : null;
  if (!want) return blocks;
  const keep = b.candidates.filter((c) => !c.analysis.form || kind(c.analysis.form) === want);
  if (!keep.length || keep.length === b.candidates.length) return blocks;
  const out = blocks.slice();
  const why = { q: 'a question mark: the question form', cmd: 'an exclamation mark: a command or "let\u2019s"', stmt: 'a full stop: the statement' }[want];
  out[i] = { ...b, candidates: keep.map((c) => withReason(c, why)) };
  return out;
}

/* a word that may be a noun or an adverb and has no particle after it is the adverb (어제 yesterday, 오늘 today) */
export function adverbStage(blocks) {
  return blocks.map((b, i) => {
    const next = blocks[i + 1];
    const marked = next && next.token.start === b.token.end && next.candidates.some((c) => c.analysis.pos === 'particle');
    if (marked || !b.candidates.some((c) => c.analysis.pos === 'adv') || !b.candidates.some((c) => c.analysis.pos === 'noun') || b.pinned) return b;
    return { ...b, candidates: b.candidates.filter((c) => c.analysis.pos === 'adv').map((c) => withReason(c, 'no particle after it, so the adverb')) };
  });
}

/* The copula split off a noun (학생 + 이에요) reads as 이다 "to be". */
export function copulaStage(blocks) {
  return blocks.map((b) => (b.token.copula && !b.pinned
    ? { ...b, candidates: [{ analysis: { lemma: '이다', pos: 'verb', copula: true, form: 'cop' }, reasons: ['the copula 이다 "to be" after a noun'], links: [] }] }
    : b));
}

/* A common pronoun is the pronoun: 우리 "we", not 우리 "pen, cage"; 나 "I", not the other 나. */
const COMMON_PRONOUNS = new Set(PRONOUNS);
export function pronounStage(blocks) {
  return blocks.map((b) => {
    const pron = b.candidates.filter((c) => c.analysis.pos === 'pron');
    if (b.pinned || !COMMON_PRONOUNS.has(b.token.key) || !pron.length || pron.length === b.candidates.length) return b;
    return { ...b, candidates: pron.map((c) => ({ ...c, reasons: [...c.reasons, 'a common pronoun'] })) };
  });
}

/* -지 않다 / 못하다 / 말다: the -지 form before them is the verb being negated (먹지 않았다: not the noun 먹지). */
const NEGATORS = /^(않|안|못하|못해|못했|말|마)/;
export function negationStage(blocks) {
  return blocks.map((b, i) => {
    const next = blocks[i + 1];
    const ji = b.candidates.filter((c) => c.analysis.form === 'ji');
    if (b.pinned || !next || !ji.length || ji.length === b.candidates.length || !NEGATORS.test(next.token.key)) return b;
    return { ...b, candidates: ji.map((c) => ({ ...c, reasons: [...c.reasons, `-지 before ${next.token.surface}: the verb it negates`] })) };
  });
}
