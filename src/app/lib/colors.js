/**
 * Colour = the language's primary channel (case for Latin), border style = a secondary channel
 * (number), badge = always. Generated from a language inventory (spec 2026-10-18 §4) by
 * makeColors(); the module's bare exports are the Latin instance, so the Latin page is unchanged.
 *
 * The six hues are Okabe–Ito, validated with the dataviz palette validator, all pairs, light
 * surface (docs/FEEDBACK-2026-10-18.md B5): the worst colour-blind pair sits in the band that is
 * legal only with a second channel — the badge and the border style are that channel. A primary
 * value beyond the six shares a hue (`sharesHueOf`) and takes its own border style.
 * Nothing is ever blended: an ambiguous block is white with a `?` and one dot per candidate hue;
 * an unknown word is white with a `!`.
 */
import { LATIN_INVENTORY } from '../../lang/la/inventory.js';

export const HUES = ['#0072B2', '#E69F00', '#009E73', '#D55E00', '#CC79A7', '#56B4E9'];
export const VERB_COLOR = '#222222';
export const FUNCTION_COLOR = '#8a8a8a';
export const NEUTRAL_COLOR = '#c8c8c8';
const WHITE = '#fff';

const TENSE_BADGE = { pres: 'pr', impf: 'im', fut: 'fu', perf: 'pf', plup: 'pl', futp: 'fp', aor: 'ao' };

/** A tint of the hue over white: the singular stronger, the plural (or any dashed value) paler. */
export function tint(hex, number) {
  const pct = number === 'pl' ? 12 : 26;
  return `color-mix(in srgb, ${hex} ${pct}%, white)`;
}

/** Same vocabulary as the CLI (tools/parse_cli.mjs): what a candidate list prints. */
export function describeAnalysis(a) {
  if (a.pos === 'verb') return ['verb', a.person, a.gender, a.number, a.tense, a.mood, a.voice, a.polarity].filter((v) => v != null && v !== 'x').join(' ');
  if (a.pos === 'prep') return `prep ${Array.isArray(a.governs) ? a.governs.join('/') : (a.governs ?? '')}`.trim();
  const parts = ['case', 'number', 'gender', 'degree'].map((k) => a[k]).filter((v) => v != null && v !== 'x');
  return [a.pos, ...parts].join(' ');
}

export function makeColors(inventory) {
  const primary = inventory.channels[inventory.primary];
  const order = primary.hueOrder ?? primary.values;
  const COLORS = {};
  order.forEach((v, i) => { if (i < HUES.length) COLORS[v] = HUES[i]; });
  for (const [v, of] of Object.entries(primary.sharesHueOf ?? {})) COLORS[v] = COLORS[of];
  // keep the inventory's own value order for the keys
  const ordered = {};
  for (const v of primary.values) if (v in COLORS) ordered[v] = COLORS[v];

  const nominal = new Set(inventory.families.nominal);
  const verbs = new Set(inventory.families.verb);
  function family(analysis) {
    if (nominal.has(analysis.pos)) return 'nominal';
    if (verbs.has(analysis.pos)) return 'verb';
    return 'function';
  }
  function badge(analysis) {
    // a possessed noun shows its owner (Turkish evime: Yön 1sg)
    if (family(analysis) === 'nominal') return `${primary.badge[analysis[inventory.primary]] ?? '—'}${analysis.poss && analysis.poss !== 'x' ? ` ${analysis.poss}` : ''}`;
    if (inventory.formBadge && family(analysis) === 'verb') return inventory.formBadge[analysis.form] ?? analysis.form ?? '—';
    if (analysis.pos === 'verb') {
      const tense = TENSE_BADGE[analysis.tense] ?? analysis.tense;
      if (analysis.mood === 'inf') return `inf ${tense}`;
      if (analysis.mood === 'part') return `part${tense ? ` ${tense}` : ''}${analysis.voice === 'pass' ? ' ps' : ''}`;
      // the passive and the negative show (Greek φοβάσαι, Turkish kalmaz); a past by gender has no person (Czech byl)
      const extra = `${analysis.voice === 'pass' ? ' ps' : ''}${analysis.polarity === 'neg' ? ' neg' : ''}${analysis.definite === 'def' ? ' def' : ''}`;
      if ((!analysis.person || analysis.person === 'x') && analysis.gender && analysis.gender !== 'x') return `${analysis.gender}.${analysis.number} ${tense}${extra}`;
      return `${analysis.person}${analysis.number} ${tense}${extra}`;
    }
    if (analysis.pos === 'prep') return 'Prp';
    // a particle that governs a role (Japanese を) shows that role's badge
    if (Array.isArray(analysis.governs) && analysis.governs.length) return primary.badge[analysis.governs[0]] ?? '—';
    return '—';
  }
  /** border style: the primary value's own, else a secondary channel's value, else solid */
  function borderOf(analysis) {
    const own = primary.border?.[analysis[inventory.primary]];
    if (own) return own;
    for (const [name, ch] of Object.entries(inventory.channels)) {
      if (name === inventory.primary || !ch.border) continue;
      const b = ch.border[analysis[name]];
      if (b) return b;
    }
    return 'solid';
  }
  const paleness = (analysis) => (borderOf(analysis) === 'dashed' ? 'pl' : 'sg');
  function inks(analysis) {
    switch (family(analysis)) {
      case 'nominal': {
        const c = ordered[analysis[inventory.primary]];
        if (!c) return [[NEUTRAL_COLOR, 'sg', 'solid']];
        return [[c, paleness(analysis), borderOf(analysis)]];
      }
      case 'verb': return [[VERB_COLOR, paleness(analysis), borderOf(analysis) === 'dashed' ? 'dashed' : 'solid']];
      default:
        if (Array.isArray(analysis.governs) && analysis.governs.length) {
          return analysis.governs.map((c) => [ordered[c] ?? FUNCTION_COLOR, 'sg', 'solid']);
        }
        return [[FUNCTION_COLOR, 'sg', 'dotted']];
    }
  }
  function blockStyle(block, layers) {
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

  const nm = (ch, v, lang) => ch.name?.[lang]?.[v] ?? v;
  const first = order[0];
  const LEGEND = [];
  for (const v of order.filter((v) => v in ordered)) {
    LEGEND.push({ key: v, label: nm(primary, v, 'en'), labelPt: nm(primary, v, 'pt'), badge: primary.badge[v], fill: tint(ordered[v], 'sg'), border: ordered[v], borderStyle: 'solid',
      meaning: `${nm(primary, v, 'en')} singular: the ${nm(primary, v, 'en')} hue, solid border`,
      meaningPt: `${nm(primary, v, 'pt')} singular: a cor do ${nm(primary, v, 'pt')}, borda contínua` });
  }
  for (const [v, of] of Object.entries(primary.sharesHueOf ?? {})) {
    LEGEND.push({ key: v, label: nm(primary, v, 'en'), labelPt: nm(primary, v, 'pt'), badge: primary.badge[v], fill: tint(ordered[v], 'sg'), border: ordered[v], borderStyle: primary.border?.[v] ?? 'solid',
      meaning: `${nm(primary, v, 'en')}: the ${nm(primary, of, 'en')} hue with a ${primary.border?.[v] ?? 'solid'} border`,
      meaningPt: `${nm(primary, v, 'pt')}: a cor do ${nm(primary, of, 'pt')} com borda ${primary.border?.[v] === 'double' ? 'dupla' : 'contínua'}` });
  }
  for (const [name, ch] of Object.entries(inventory.channels)) {
    if (name === inventory.primary || !ch.border) continue;
    for (const [v, style] of Object.entries(ch.border)) {
      const paler = style === 'dashed';
      LEGEND.push({ key: v, label: nm(ch, v, 'en'), labelPt: nm(ch, v, 'pt'), badge: primary.badge[first], fill: tint(ordered[first], paler ? 'pl' : 'sg'), border: ordered[first], borderStyle: style,
        meaning: `any ${inventory.primary} in the ${nm(ch, v, 'en')}: the same hue, ${paler ? 'paler fill, ' : ''}${style} border`,
        meaningPt: `qualquer ${inventory.primary === 'case' ? 'caso' : inventory.primary} no ${nm(ch, v, 'pt')}: a mesma cor, ${paler ? 'fundo mais claro, ' : ''}borda ${style === 'dashed' ? 'tracejada' : style === 'double' ? 'dupla' : 'contínua'}` });
    }
  }
  const acc = ordered.acc ?? ordered[order[3]] ?? ordered[first];
  const abl = ordered.abl ?? ordered[order[4]] ?? ordered[first];
  LEGEND.push(
    ...(inventory.showArticle ? [{ key: 'article', label: 'der / die / das', labelPt: 'der / die / das', badge: primary.badge[first], fill: tint(ordered[first], 'sg'), border: ordered[first], borderStyle: 'solid',
      meaning: 'above every noun: its article, which is its gender — der masculine, die feminine, das neuter, die (Pl.) for a plural; both when the dictionary has two',
      meaningPt: 'acima de cada substantivo: o seu artigo, que é o seu gênero — der masculino, die feminino, das neutro, die (Pl.) no plural; os dois quando o dicionário tem dois' }] : []),
    { key: 'verb', label: 'verb', badge: '3sg pf', fill: tint(VERB_COLOR, 'sg'), border: VERB_COLOR, borderStyle: 'solid',
      meaning: 'a finite verb: dark border, badge is person·number and tense (pr im fu pf pl fp)' },
    { key: 'function', label: 'function word', badge: '—', fill: WHITE, border: FUNCTION_COLOR, borderStyle: 'dotted',
      meaning: 'conjunction, adverb, particle: grey dotted border. A preposition takes the hue of the case it governs, badge Prp' },
    { key: 'unknown', label: 'not in the dictionary', badge: '!', fill: WHITE, border: NEUTRAL_COLOR, borderStyle: 'dotted',
      meaning: 'the word is not in the dictionary (most proper names): white, italic, !' },
    { key: 'ambiguous', label: 'ambiguous', badge: '?', fill: WHITE, border: NEUTRAL_COLOR, borderStyle: 'solid', dots: [ordered[first], abl],
      meaning: 'more than one reading survives: white with a ? and one dot per possible case. Click it and pin the reading you believe' },
    { key: 'pinned', label: 'pinned by you', badge: primary.badge[first], fill: tint(ordered[first], 'sg'), border: ordered[first], borderStyle: 'solid', pinned: true,
      meaning: 'a reading you chose, not the parser’s: black dotted ring. Unpin it in the dictionary' },
    { key: 'chunk', label: 'glued chunk', badge: 'Prp', fill: tint(abl, 'sg'), border: abl, borderStyle: 'solid', chunk: true,
      meaning: 'a preposition and its object (or a fixed expression such as es war einmal) move as one; the ⛓ control unglues them' },
    { key: 'linked', label: 'agreement partner', badge: primary.badge.acc ?? primary.badge[first], fill: tint(acc, 'sg'), border: acc, borderStyle: 'solid', linked: true,
      meaning: 'the word under the mouse gets a purple ring; the words that agree with it get this yellow ring. They still move independently' },
  );
  return { COLORS: ordered, family, badge, blockStyle, LEGEND, describeAnalysis };
}

// The Latin instance: what the page used before languages existed.
const LATIN = makeColors(LATIN_INVENTORY);
export const CASE_COLORS = LATIN.COLORS;
export const family = LATIN.family;
export const badge = LATIN.badge;
export const blockStyle = LATIN.blockStyle;
export const LEGEND = LATIN.LEGEND;
