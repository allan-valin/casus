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
