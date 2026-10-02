import { GOVERNMENT } from './prepositions.js';

/*
 * The §4.1 cascade as narrowing stages. Everything here is pure: stages take
 * blocks and return new blocks; `narrow` is the invariant guard every stage
 * runs through — a stage may never empty a candidate set, and if it would,
 * that block's result is discarded and the previous set stands.
 */

const LEXICON_REASON = 'lexicon: attested form';

/**
 * Candidate = { analysis, reasons: string[] }
 * Block = { token, candidates: Candidate[], pinned: Analysis | null, resolved: boolean }
 */
export function buildBlocks(tokens, analysesByKey) {
  return tokens
    .filter((t) => t.kind === 'word')
    .map((token) => finish({
      token,
      candidates: (analysesByKey.get(token.key) ?? []).map((analysis) => ({
        analysis,
        reasons: [LEXICON_REASON],
      })),
      pinned: null,
    }));
}

/** Apply a stage; restore any block it emptied that was not empty before. */
export function narrow(blocks, stage) {
  const out = stage(blocks);
  return out.map((block, i) => {
    const before = blocks[i];
    if (block.candidates.length === 0 && before.candidates.length > 0) return before;
    return finish(block);
  });
}

function finish(block) {
  return { ...block, resolved: block.candidates.length === 1 };
}

const NOMINAL_TARGETS = new Set(['adj', 'vpar', 'pron']);
const WITNESSES = new Set(['noun', 'pron']);

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
  return `${a.case} ${a.number} ${a.gender}`;
}

/**
 * Stage 2. An adjective, participle or pronoun keeps the readings that agree
 * in case, number and gender with some noun (or pronoun) in the sentence,
 * resolved nouns first; with no agreeing nominal at all the block is left as
 * it was. Nouns are evidence, not targets. Deliberate limitation (plan
 * self-review): an adjective can agree with a noun it does not modify — the
 * reason names the witness so the reader can repin.
 */
export function agreementStage(blocks) {
  return blocks.map((block, i) => {
    const targets = block.candidates.filter((c) => NOMINAL_TARGETS.has(c.analysis.pos));
    if (targets.length === 0) return block;
    const witnesses = blocks
      .filter((b, j) => j !== i && b.candidates.some((c) => WITNESSES.has(c.analysis.pos)));
    const resolved = witnesses.filter((b) => b.resolved || b.pinned);
    const kept = matchAgainst(targets, resolved) ?? matchAgainst(targets, witnesses);
    if (!kept) return block;
    return { ...block, candidates: kept };
  });
}

function matchAgainst(targets, witnesses) {
  const kept = [];
  for (const candidate of targets) {
    for (const witness of witnesses) {
      const match = witness.candidates.find(
        (w) => WITNESSES.has(w.analysis.pos) && agrees(candidate.analysis, w.analysis),
      );
      if (match) {
        const reason = `agreement: matches ${witness.token.surface} (${describe(match.analysis)})`;
        const reasons = candidate.reasons.includes(reason) ? candidate.reasons : [...candidate.reasons, reason];
        kept.push({ ...candidate, reasons });
        break;
      }
    }
  }
  return kept.length > 0 ? kept : null;
}


const CASE_NAME = { nom: 'nominative', voc: 'vocative', gen: 'genitive', loc: 'locative', dat: 'dative', abl: 'ablative', acc: 'accusative' };

function governedBy(token, analysis) {
  if (GOVERNMENT[token.key]) return GOVERNMENT[token.key];
  if (analysis.governs && analysis.governs !== 'x') {
    return Array.isArray(analysis.governs) ? analysis.governs : [analysis.governs];
  }
  return [];
}

function withReason(candidate, reason) {
  return candidate.reasons.includes(reason) ? candidate : { ...candidate, reasons: [...candidate.reasons, reason] };
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
export function governmentStage(blocks) {
  const out = blocks.map((block) => ({
    ...block,
    candidates: block.candidates.map((c) => (c.analysis.pos === 'prep'
      ? { ...c, analysis: { ...c.analysis, governs: governedBy(block.token, c.analysis) } }
      : c)),
  }));

  for (let i = 0; i < out.length - 1; i += 1) {
    const prep = out[i];
    const preps = prep.candidates.filter((c) => c.analysis.pos === 'prep' && c.analysis.governs.length > 0);
    if (preps.length === 0) continue;
    const governs = [...new Set(preps.flatMap((c) => c.analysis.governs))];
    const object = out[i + 1];
    const kept = object.candidates.filter((c) => c.analysis.case && governs.includes(c.analysis.case));
    if (kept.length === 0) continue;

    const survivingCases = [...new Set(kept.map((c) => c.analysis.case))];
    const name = prep.token.surface;
    if (survivingCases.length === 1) {
      const theCase = survivingCases[0];
      const prepReason = `government: ${name} + ${theCase} (object ${object.token.surface} is ${CASE_NAME[theCase]})`;
      out[i] = {
        ...prep,
        candidates: prep.candidates.map((c) => (c.analysis.pos === 'prep'
          ? withReason({ ...c, analysis: { ...c.analysis, governs: [theCase] } }, prepReason)
          : c)),
      };
    }
    const objectReason = `government: governed by ${name} (${survivingCases.join('/')})`;
    out[i + 1] = { ...object, candidates: kept.map((c) => withReason(c, objectReason)) };
  }
  return out;
}
