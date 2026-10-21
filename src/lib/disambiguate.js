import { GOVERNMENT } from './prepositions.js';

/*
 * The §4.1 cascade as narrowing stages. Everything here is pure: stages take
 * blocks and return new blocks; `narrow` is the invariant guard every stage
 * runs through — a stage may never empty a candidate set, and if it would,
 * that block's result is discarded and the previous set stands.
 */

const LEXICON_REASON = 'lexicon: attested form';

/**
 * Candidate = { analysis, reasons: string[], links: Array<{ kind: 'agreement' | 'government', index: number }> }
 *   `reasons` is prose for a person; `links` names the token index of the witness
 *   or governor so the UI never parses the prose.
 * Block = { token, candidates: Candidate[], pinned: Analysis | null, resolved: boolean }
 */
/** key + altKey; when both find nothing, the first spelling fallback that does (ungeheueren → ungeheuren). */
function lookedUp(token, analysesByKey) {
  const found = [...(analysesByKey.get(token.key) ?? []), ...(token.altKey ? analysesByKey.get(token.altKey) ?? [] : [])];
  if (found.length || !token.fallbackKeys) return found.map((analysis) => ({ analysis }));
  for (const k of token.fallbackKeys) {
    const hit = analysesByKey.get(k) ?? [];
    if (hit.length) return hit.map((analysis) => ({ analysis, via: k }));
  }
  return [];
}

export function buildBlocks(tokens, analysesByKey) {
  return tokens
    .filter((t) => t.kind === 'word')
    .map((token) => finish({
      token,
      // a token may carry an alternative key (German sentence-initial capitals): both keys' readings
      candidates: lookedUp(token, analysesByKey).map(({ analysis, via }) => ({
        analysis,
        reasons: [via ? `lexicon: read as ${via} (spelling variant)` : LEXICON_REASON],
        links: [],
      })),
      pinned: null,
    }));
}

/** Apply a stage; restore any block it emptied that was not empty before. */
export function narrow(blocks, stage) {
  const out = stage(blocks);
  if (out.length !== blocks.length) throw new Error(`stage returned ${out.length} blocks for ${blocks.length}`);
  out.forEach((b, i) => { if (b.token !== blocks[i].token) throw new Error('stage changed the block order'); });
  return out.map((block, i) => {
    const before = blocks[i];
    if (block.candidates.length === 0 && before.candidates.length > 0) return before;
    return finish(block);
  });
}

function finish(block) {
  return { ...block, resolved: block.candidates.length === 1 };
}

/* Latin's agreement roles; a language definition's inventory.agreement overrides them. */
export const LATIN_AGREEMENT = { targets: ['adj', 'vpar', 'pron'], witnesses: ['noun', 'pron'] };

function genderFits(a, b) {
  if (a === b || a === 'x' || b === 'x') return true;
  const mf = (g) => g === 'm' || g === 'f' || g === 'c';
  return (a === 'c' && mf(b)) || (b === 'c' && mf(a));
}

function agrees(a, b) {
  return a.case === b.case
    && (a.number === b.number || a.number === 'x' || b.number === 'x')
    && genderFits(a.gender, b.gender);
}

function describe(a) {
  return `${a.case ?? 'x'} ${a.number ?? 'x'} ${a.gender ?? 'x'}`;
}

/**
 * Stage 2. An adjective, participle or pronoun keeps the readings that agree
 * in case, number and gender with some noun (or pronoun) in the sentence,
 * resolved nouns first; with no agreeing nominal at all the block is left as
 * it was. Nouns are evidence, not targets. Deliberate limitation (plan
 * self-review): an adjective can agree with a noun it does not modify — the
 * reason names the witness so the reader can repin.
 */
export function agreementStage(blocks, inventory = { agreement: LATIN_AGREEMENT }) {
  const NOMINAL_TARGETS = new Set(inventory.agreement?.targets ?? LATIN_AGREEMENT.targets);
  const WITNESSES = new Set(inventory.agreement?.witnesses ?? LATIN_AGREEMENT.witnesses);
  return blocks.map((block, i) => {
    // agreement stays inside the clause (between , ; :) when the tokens say where clauses are
    const clause = block.token.clause;
    const otherBlocks = blocks.filter((b, j) => j !== i && (clause === undefined || b.token.clause === undefined || b.token.clause === clause));
    const targets = block.candidates.filter((c) => NOMINAL_TARGETS.has(c.analysis.pos));
    if (targets.length > 0) {
      const witnesses = otherBlocks.filter((b) => b.candidates.some((c) => WITNESSES.has(c.analysis.pos)));
      const resolved = witnesses.filter((b) => b.resolved || b.pinned);
      const kept = matchAgainst(targets, resolved, WITNESSES) ?? matchAgainst(targets, witnesses, WITNESSES);
      if (!kept) return block;
      // Evidence for an adjective reading is not evidence against the noun or
      // verb reading of the same form (senatus, bonum, Romanus): those stay.
      const others = block.candidates.filter((c) => !NOMINAL_TARGETS.has(c.analysis.pos));
      return { ...block, candidates: [...kept, ...others] };
    }
    // The other direction, resolved side only: an adjective already settled
    // (by a preposition, a pin, or an earlier pass) narrows its noun. Two
    // ambiguous nouns never pair, and two ambiguous words never narrow each other.
    const nouns = block.candidates.filter((c) => c.analysis.pos === 'noun');
    if (nouns.length < 2 || block.pinned) return block;
    const settled = otherBlocks.filter((b) => (b.resolved || b.pinned)
      && b.candidates.some((c) => NOMINAL_TARGETS.has(c.analysis.pos)));
    const kept = matchAgainst(nouns, settled, NOMINAL_TARGETS);
    return kept ? { ...block, candidates: kept } : block;
  });
}

function matchAgainst(targets, witnesses, witnessPos) {
  const kept = [];
  for (const candidate of targets) {
    for (const witness of witnesses) {
      const match = witness.candidates.find(
        (w) => witnessPos.has(w.analysis.pos) && agrees(candidate.analysis, w.analysis),
      );
      if (match) {
        const reason = `agreement: matches ${witness.token.surface} (${describe(match.analysis)})`;
        kept.push(withLink(withReason(candidate, reason), 'agreement', witness.token.index));
        break;
      }
    }
  }
  return kept.length > 0 ? kept : null;
}


const CASE_NAME = { nom: 'nominative', voc: 'vocative', gen: 'genitive', loc: 'locative', dat: 'dative', abl: 'ablative', acc: 'accusative', ins: 'instrumental', pre: 'prepositional' };

function ownGoverns(analysis) {
  if (analysis.governs && analysis.governs !== 'x') {
    return Array.isArray(analysis.governs) ? analysis.governs : [analysis.governs];
  }
  return [];
}

/** A pinned reading is a fixed fact and keeps what the lexicon gave it; otherwise the table fills in. */
function governedBy(block, analysis, government = GOVERNMENT) {
  if (block.pinned) return ownGoverns(analysis);
  if (government[block.token.key]) return government[block.token.key];
  return ownGoverns(analysis);
}

function withReason(candidate, reason) {
  return candidate.reasons.includes(reason) ? candidate : { ...candidate, reasons: [...candidate.reasons, reason] };
}

function withLink(candidate, kind, index) {
  const links = candidate.links ?? [];
  if (links.some((l) => l.kind === kind && l.index === index)) return candidate;
  return { ...candidate, links: [...links, { kind, index }] };
}

/**
 * Stage 3. Every preposition reading is annotated with the cases it governs
 * (the table in prepositions.js, else what the lexicon recorded). Its object
 * is the next word block — v1 assumes adjacency; anastrophe is the reader's
 * unglue case (spec §7.5). The object keeps the readings in a governed case,
 * and if those select exactly one governed case the preposition narrows to it:
 * `in urbe` settles the ablative, `in Galliam` the accusative, and when both
 * stay open both stay striped.
 */
const PHRASE_MEMBERS = new Set(['det', 'adj', 'num', 'pron', 'vpar']);

/** With `phrase` (German): the blocks after a preposition while each can be a determiner, adjective,
 * numeral or pronoun, up to and including the first that can be a noun (at most five); else the next one. */
function governedSpan(blocks, i, phrase) {
  if (!phrase) return [i + 1];
  const span = [];
  for (let j = i + 1; j < blocks.length && span.length < 5; j += 1) {
    const poses = blocks[j].candidates.map((c) => c.analysis.pos);
    if (poses.includes('noun')) { span.push(j); break; }
    // an unknown inflected word inside the phrase (an old spelling, a rare participle) does not cut it
    if (!poses.length && /^[\p{Ll}].*(en|em|er|es|e)$/u.test(blocks[j].token.surface)) { span.push(j); continue; }
    // a personal pronoun is a whole phrase on its own (mit ihm): it ends the span (review I1)
    if (poses.includes('pron') && !poses.some((p) => p === 'det' || p === 'adj' || p === 'num') && !/^(dies|jen|jed|kein|welch|manch|solch|all|beid|mein|dein|sein|unser|euer|eur)/i.test(blocks[j].token.surface)) { span.push(j); break; }
    if (poses.length && poses.every((p) => ['adv', 'particle'].includes(p))) { span.push(j); continue; }      // ganz, sehr: carried
    if (poses.some((p) => PHRASE_MEMBERS.has(p))) { span.push(j); continue; }
    break;
  }
  return span;
}

export function governmentStage(blocks, government = GOVERNMENT, { phrase = false } = {}) {
  const out = blocks.map((block) => ({
    ...block,
    candidates: block.candidates.map((c) => (c.analysis.pos === 'prep'
      ? { ...c, analysis: { ...c.analysis, governs: governedBy(block, c.analysis, government) } }
      : c)),
  }));

  for (let i = 0; i < out.length - 1; i += 1) {
    const prep = out[i];
    if (prep.token.range) continue;                          // bis between two numbers governs nothing
    const preps = prep.candidates.filter((c) => c.analysis.pos === 'prep' && c.analysis.governs.length > 0);
    if (preps.length === 0) continue;
    const governs = [...new Set(preps.flatMap((c) => c.analysis.governs))];
    // an indeclinable reading (case x) says nothing about government: it stays as it is
    const caseOk = (c, allowed) => c.analysis.case && (c.analysis.case === 'x' || allowed.includes(c.analysis.case));
    // the phrase is contiguous: a member with no reading in the governed cases ends it, it is not skipped
    const span = [];
    const carried = [];
    for (const j of governedSpan(out, i, phrase)) {
      if (!out[j].candidates.length) continue;                    // unknown member: carried, not narrowed
      const caseless = out[j].candidates.every((c) => !c.analysis.case || c.analysis.case === 'x');
      if (phrase && caseless) { carried.push(j); continue; }      // a numeral, an uninflected adjective or adverb
      if (!out[j].candidates.some((c) => caseOk(c, governs) && c.analysis.case !== 'x')) break;
      span.push(j);
    }
    if (span.length === 0) continue;
    // the cases every member of the phrase still allows; one shared case settles the preposition
    let shared = governs;
    for (const j of span) {
      const own = new Set(out[j].candidates.filter((c) => caseOk(c, governs)).map((c) => c.analysis.case).filter((k) => k !== 'x'));
      const next = shared.filter((k) => own.has(k));
      if (next.length) shared = next;
    }
    const name = prep.token.surface;
    const head = out[span[span.length - 1]];
    // NP4 (phrase languages): a word followed by the phrase it governs is the preposition
    if (phrase && prep.candidates.some((c) => c.analysis.pos !== 'prep')) {
      out[i] = { ...out[i], candidates: out[i].candidates.filter((c) => c.analysis.pos === 'prep') };
    }
    if (shared.length === 1) {
      const theCase = shared[0];
      const prepReason = `government: ${name} + ${theCase} (object ${head.token.surface} is ${CASE_NAME[theCase] ?? theCase})`;
      out[i] = {
        ...out[i],
        candidates: out[i].candidates.map((c) => (c.analysis.pos === 'prep'
          ? withLink(withReason({ ...c, analysis: { ...c.analysis, governs: [theCase] } }, prepReason), 'government', head.token.index)
          : c)),
      };
    }
    const objectReason = `government: governed by ${name} (${shared.join('/')})`;
    const fresh = (c) => ({ ...c, reasons: c.reasons.filter((r) => !r.startsWith(`government: governed by ${name} (`)) });   // a later pass replaces, not adds
    for (const j of span) {
      const object = out[j];
      const kept = object.candidates.filter((c) => caseOk(c, shared));
      if (!kept.some((c) => c.analysis.case !== 'x')) continue;
      out[j] = { ...object, candidates: kept.map((c) => (c.analysis.case === 'x' ? c : withLink(withReason(fresh(c), objectReason), 'government', prep.token.index))) };
    }
    for (const j of carried) {
      if (j > span[span.length - 1]) continue;
      out[j] = { ...out[j], candidates: out[j].candidates.map((c) => withLink(c, 'government', prep.token.index)) };
    }
  }
  return out;
}

const PIN_REASON = 'pin: chosen by the reader';

/**
 * The whole cascade: lexicon (buildBlocks), pins as fixed facts, then
 * government, agreement, government — resolving an object can feed agreement,
 * which can feed another preposition. Two passes are enough for v1; a
 * fixed-point loop is a later refinement and would need a cycle guard.
 */
/** Latin's stage order: government, agreement, government (resolving an object feeds agreement). */
// wrapped: a stage receives (blocks, ctx), and these two use their second parameter for their own tables
export const LATIN_STAGES = [(b) => governmentStage(b), (b) => agreementStage(b), (b) => governmentStage(b)];

export function runCascade(tokens, analysesByKey, { pins = new Map(), stages = LATIN_STAGES, ctx = null } = {}) {
  let blocks = buildBlocks(tokens, analysesByKey).map((block) => {
    const pinned = pins.get(block.token.index);
    if (!pinned) return block;
    return { ...block, pinned, resolved: true, candidates: [{ analysis: pinned, reasons: [PIN_REASON], links: [] }] };
  });
  for (const stage of stages) blocks = narrow(blocks, (b) => stage(b, ctx));
  return blocks;
}
