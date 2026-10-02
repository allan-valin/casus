/** Hue = case, brightness = number (spec §7.1). Degrees on the HSL wheel, spread so neighbours differ. */
export const CASE_HUES = { nom: 210, gen: 30, dat: 270, acc: 0, abl: 120, voc: 330, loc: 60 };
export const VERB_HUE = 180;
export const FUNCTION_HUE = 0;
const NEUTRAL = 'hsl(0 0% 85%)';

const CASE_BADGE = { nom: 'Nm', gen: 'Gn', dat: 'Dt', acc: 'Ac', abl: 'Ab', voc: 'Vc', loc: 'Lc' };
const TENSE_BADGE = { pres: 'pr', impf: 'im', fut: 'fu', perf: 'pf', plup: 'pl', futp: 'fp' };
const NOMINAL = new Set(['noun', 'adj', 'pron', 'num', 'vpar', 'supine']);

export function family(analysis) {
  if (NOMINAL.has(analysis.pos)) return 'nominal';
  if (analysis.pos === 'verb') return 'verb';
  return 'function';
}

export function badge(analysis) {
  if (family(analysis) === 'nominal') return CASE_BADGE[analysis.case] ?? '—';
  if (analysis.pos === 'verb') {
    const tense = TENSE_BADGE[analysis.tense] ?? analysis.tense;
    if (analysis.mood === 'inf') return `inf ${tense}`;
    return `${analysis.person}${analysis.number} ${tense}`;
  }
  if (analysis.pos === 'prep') return 'Prp';
  return '—';
}

/** Singular is the saturated colour; plural is the same hue, paler (spec: bright singular, dim plural). */
function hsl(hue, number) {
  const light = number === 'pl' ? 78 : 62;
  return hue === null ? NEUTRAL : `hsl(${hue} 70% ${light}%)`;
}

/** The hues a candidate paints with: one per case for nominals, one per governed case for a preposition. */
function hues(analysis) {
  switch (family(analysis)) {
    case 'nominal': return analysis.case in CASE_HUES ? [[CASE_HUES[analysis.case], analysis.number]] : [[null, 'sg']];
    case 'verb': return [[VERB_HUE, analysis.number === 'pl' ? 'pl' : 'sg']];
    default:
      if (analysis.pos === 'prep' && Array.isArray(analysis.governs) && analysis.governs.length) {
        return analysis.governs.map((c) => [CASE_HUES[c] ?? null, 'sg']);
      }
      return [[null, 'sg']];
  }
}

function stripes(colours) {
  const step = 8;
  const stops = colours.map((c, i) => `${c} ${i * step}px ${(i + 1) * step}px`).join(', ');
  return `repeating-linear-gradient(135deg, ${stops})`;
}

/**
 * blockStyle(block, layers) -> { background, badge, striped, unknown }
 * Ambiguity is shown, never guessed: more than one distinct hue or badge means stripes and a `?`.
 */
export function blockStyle(block, layers) {
  if (block.candidates.length === 0) return { background: NEUTRAL, badge: '!', striped: false, unknown: true };
  const shown = block.candidates.filter((c) => layers[family(c.analysis)]);
  if (shown.length === 0) return { background: NEUTRAL, badge: '', striped: false, unknown: false };
  const colours = [...new Set(shown.flatMap((c) => hues(c.analysis)).map(([h, n]) => hsl(h, n)))];
  const badges = [...new Set(shown.map((c) => badge(c.analysis)))];
  if (colours.length === 1 && badges.length === 1) {
    return { background: colours[0], badge: badges[0], striped: false, unknown: false };
  }
  return { background: stripes(colours.length > 1 ? colours : [colours[0], NEUTRAL]), badge: '?', striped: true, unknown: false };
}
