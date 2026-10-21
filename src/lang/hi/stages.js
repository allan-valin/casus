/*
 * Hindi postpositions (2026-10-21): ने, को, से, में, पर, तक, का / की / के and the compound ones (के लिए, के साथ…)
 * follow their noun, which then stands in the oblique (लड़का → लड़के ने, किताबें → किताबों में). A noun, adjective
 * or pronoun right before one keeps its oblique readings; after ने it is the subject of a perfective verb (ergative).
 */
import { makeClosedStage, prep } from '../romance.js';

const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });
export const POSTPOSITIONS = new Set(['ने', 'को', 'से', 'में', 'पर', 'तक', 'का', 'की', 'के', 'वाला', 'वाली', 'वाले']);
const NOMINAL = new Set(['noun', 'adj', 'pron', 'det', 'num']);

export function postpositionStage(blocks) {
  return blocks.map((b, i) => {
    const next = blocks[i + 1];
    if (b.pinned || !next || !POSTPOSITIONS.has(next.token.key)) return b;
    const keep = b.candidates.filter((c) => NOMINAL.has(c.analysis.pos) && ['obl', 'erg', 'dat', 'gen'].includes(c.analysis.case));
    if (!keep.length || keep.length === b.candidates.length) return b;
    const r = next.token.key === 'ने' ? `before ने: the oblique, the subject of a perfective verb` : `before the postposition ${next.token.surface}: the oblique`;
    return { ...b, candidates: keep.map((c) => withReason(c, r)) };
  });
}

// the postpositions and the genitive का / की / के take their readings from this table (के has no entry of its own)
export const closedStage = makeClosedStage(Object.fromEntries([...POSTPOSITIONS].filter((w) => !w.startsWith('वाल')).map((w) => [w, [prep(w)]])));
