/**
 * Colour = case, border style = number, badge = always (spec §7.1, reworked after Allan's
 * feedback of 2026-10-18, docs/FEEDBACK-2026-10-18.md B4–B6):
 *
 * - six Okabe–Ito hues for the six living cases. Validated with the dataviz palette
 *   validator, all pairs, light surface: lightness band, chroma floor and the normal-vision
 *   floor pass; the worst colour-blind pair (ablative ↔ dative, deutan ΔE 7.6) sits in the
 *   band that is legal only with a second channel — the two-letter badge and the border style
 *   are that channel. The locative is rare and historically merged into the ablative, so it
 *   shares the ablative hue and gets a double border.
 * - the full hue is the border and the badge ink; the fill is a tint of it. Singular = solid
 *   border and the stronger tint; plural = dashed border and the paler tint.
 * - nothing is ever blended. An ambiguous block is white with a `?` badge and one dot per
 *   candidate case; an unknown word is white with a `!`.
 */
export const CASE_COLORS = {
  nom: '#0072B2', gen: '#E69F00', dat: '#009E73', acc: '#D55E00', abl: '#CC79A7', voc: '#56B4E9',
  loc: '#CC79A7',
};
export const VERB_COLOR = '#222222';
export const FUNCTION_COLOR = '#8a8a8a';
export const NEUTRAL_COLOR = '#c8c8c8';
const WHITE = '#fff';

const CASE_NAME = { nom: 'nominative', gen: 'genitive', dat: 'dative', acc: 'accusative', abl: 'ablative', voc: 'vocative', loc: 'locative' };
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

/** A tint of the hue over white: the singular stronger, the plural paler. */
export function tint(hex, number) {
  const pct = number === 'pl' ? 12 : 26;
  return `color-mix(in srgb, ${hex} ${pct}%, white)`;
}

/** [colour, number, style] triples a candidate paints with. */
function inks(analysis) {
  switch (family(analysis)) {
    case 'nominal': {
      const c = CASE_COLORS[analysis.case];
      if (!c) return [[NEUTRAL_COLOR, 'sg', 'solid']];
      return [[c, analysis.number === 'pl' ? 'pl' : 'sg', analysis.case === 'loc' ? 'double' : (analysis.number === 'pl' ? 'dashed' : 'solid')]];
    }
    case 'verb': return [[VERB_COLOR, analysis.number === 'pl' ? 'pl' : 'sg', analysis.number === 'pl' ? 'dashed' : 'solid']];
    default:
      if (analysis.pos === 'prep' && Array.isArray(analysis.governs) && analysis.governs.length) {
        return analysis.governs.map((c) => [CASE_COLORS[c] ?? FUNCTION_COLOR, 'sg', 'solid']);
      }
      return [[FUNCTION_COLOR, 'sg', 'dotted']];
  }
}

/**
 * blockStyle(block, layers) -> { fill, border, borderStyle, badge, dots, ambiguous, unknown }
 * Ambiguity is shown, never guessed: more than one distinct ink or badge means white, `?` and dots.
 */
export function blockStyle(block, layers) {
  const base = { fill: WHITE, border: NEUTRAL_COLOR, borderStyle: 'solid', badge: '', dots: [], ambiguous: false, unknown: false };
  if (block.candidates.length === 0) return { ...base, borderStyle: 'dotted', badge: '!', unknown: true };
  const shown = block.candidates.filter((c) => layers[family(c.analysis)]);
  if (shown.length === 0) return base;
  const seen = new Map();
  for (const [colour, number, style] of shown.flatMap((c) => inks(c.analysis))) seen.set(`${colour}|${number}|${style}`, [colour, number, style]);
  const badges = [...new Set(shown.map((c) => badge(c.analysis)))];
  if (seen.size === 1 && badges.length === 1) {
    const [[colour, number, style]] = seen.values();
    return { ...base, fill: tint(colour, number), border: colour, borderStyle: style, badge: badges[0] };
  }
  const dots = [...new Set([...seen.values()].map(([colour]) => colour))];
  return { ...base, border: NEUTRAL_COLOR, badge: '?', dots, ambiguous: true };
}

/** The legend table (feedback B6): one row per thing the eye can meet on a block. */
export const LEGEND = [
  ...['nom', 'gen', 'dat', 'acc', 'abl', 'voc'].map((c) => ({
    key: c, label: CASE_NAME[c], badge: CASE_BADGE[c], fill: tint(CASE_COLORS[c], 'sg'), border: CASE_COLORS[c], borderStyle: 'solid',
    meaning: `${CASE_NAME[c]} singular: the ${CASE_NAME[c]} hue, solid border`,
  })),
  { key: 'loc', label: 'locative', badge: 'Lc', fill: tint(CASE_COLORS.loc, 'sg'), border: CASE_COLORS.loc, borderStyle: 'double',
    meaning: 'locative (rare: domi, Romae): the ablative hue with a double border' },
  { key: 'plural', label: 'plural', badge: 'Nm', fill: tint(CASE_COLORS.nom, 'pl'), border: CASE_COLORS.nom, borderStyle: 'dashed',
    meaning: 'any case in the plural: the same hue, paler fill, dashed border' },
  { key: 'verb', label: 'verb', badge: '3sg pf', fill: tint(VERB_COLOR, 'sg'), border: VERB_COLOR, borderStyle: 'solid',
    meaning: 'a finite verb: dark border, badge is person·number and tense (pr im fu pf pl fp)' },
  { key: 'function', label: 'function word', badge: '—', fill: WHITE, border: FUNCTION_COLOR, borderStyle: 'dotted',
    meaning: 'conjunction, adverb, particle: grey dotted border. A preposition takes the hue of the case it governs, badge Prp' },
  { key: 'unknown', label: 'not in the dictionary', badge: '!', fill: WHITE, border: NEUTRAL_COLOR, borderStyle: 'dotted',
    meaning: 'the word is not in Whitaker’s lexicon (most proper names): white, italic, !' },
  { key: 'ambiguous', label: 'ambiguous', badge: '?', fill: WHITE, border: NEUTRAL_COLOR, borderStyle: 'solid', dots: [CASE_COLORS.nom, CASE_COLORS.abl],
    meaning: 'more than one reading survives: white with a ? and one dot per possible case. Click it and pin the reading you believe' },
  { key: 'pinned', label: 'pinned by you', badge: 'Nm', fill: tint(CASE_COLORS.nom, 'sg'), border: CASE_COLORS.nom, borderStyle: 'solid', pinned: true,
    meaning: 'a reading you chose, not the parser’s: black dotted ring. Unpin it in the dictionary' },
  { key: 'chunk', label: 'glued chunk', badge: 'Prp', fill: tint(CASE_COLORS.abl, 'sg'), border: CASE_COLORS.abl, borderStyle: 'solid', chunk: true,
    meaning: 'a preposition and its object move as one; the ⛓ control unglues them (poets separate them)' },
  { key: 'linked', label: 'agreement partner', badge: 'Ac', fill: tint(CASE_COLORS.acc, 'sg'), border: CASE_COLORS.acc, borderStyle: 'solid', linked: true,
    meaning: 'the word under the mouse gets a purple ring; the words that agree with it get this yellow ring. They still move independently' },
];

/** Same vocabulary as the CLI (tools/parse_cli.mjs): what a candidate list prints. */
export function describeAnalysis(a) {
  if (a.pos === 'verb') return ['verb', a.person, a.number, a.tense, a.mood, a.voice].join(' ');
  if (a.pos === 'prep') return `prep ${Array.isArray(a.governs) ? a.governs.join('/') : (a.governs ?? '')}`.trim();
  const parts = ['case', 'number', 'gender', 'degree'].map((k) => a[k]).filter((v) => v != null && v !== 'x');
  return [a.pos, ...parts].join(' ');
}
