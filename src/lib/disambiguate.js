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
