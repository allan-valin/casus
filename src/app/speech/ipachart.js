// Copied from speech-to-ipa (github.com/allan-valin/speech-to-ipa, web/app/ipachart.js).
// The IPA chart (revised to 2020), laid out as on the printed chart so the picker
// looks familiar. Labels are the chart's own English terms.

const X = "impossible";            // shaded cell: judged impossible
const x = false;                    // shaded half (one voicing impossible)

const pulmonic = {
  places: ["bilabial", "labiodental", "dental", "alveolar", "postalveolar", "retroflex",
    "palatal", "velar", "uvular", "pharyngeal", "glottal"],
  manners: ["plosive", "nasal", "trill", "tap or flap", "fricative", "lateral fricative",
    "approximant", "lateral approximant"],
  // rows where dental, alveolar and postalveolar share one cell (the alveolar entry)
  merged: ["plosive", "nasal", "trill", "tap or flap", "lateral fricative", "approximant", "lateral approximant"],
  // [voiceless, voiced] per place; null = blank cell
  cells: [
    [["p", "b"], null, null, ["t", "d"], null, ["ʈ", "ɖ"], ["c", "ɟ"], ["k", "ɡ"], ["q", "ɢ"], [null, x], ["ʔ", x]],
    [[null, "m"], [null, "ɱ"], null, [null, "n"], null, [null, "ɳ"], [null, "ɲ"], [null, "ŋ"], [null, "ɴ"], X, X],
    [[null, "ʙ"], null, null, [null, "r"], null, null, null, X, [null, "ʀ"], null, X],
    [null, [null, "ⱱ"], null, [null, "ɾ"], null, [null, "ɽ"], null, X, null, null, X],
    [["ɸ", "β"], ["f", "v"], ["θ", "ð"], ["s", "z"], ["ʃ", "ʒ"], ["ʂ", "ʐ"], ["ç", "ʝ"], ["x", "ɣ"], ["χ", "ʁ"], ["ħ", "ʕ"], ["h", "ɦ"]],
    [X, X, null, ["ɬ", "ɮ"], null, null, null, null, null, X, X],
    [null, [null, "ʋ"], null, [null, "ɹ"], null, [null, "ɻ"], [null, "j"], [null, "ɰ"], null, null, null],
    [X, X, null, [null, "l"], null, [null, "ɭ"], [null, "ʎ"], [null, "ʟ"], null, X, X],
  ],
};

// height 0 (close) … 6 (open); back 0 front … 2 back (0.5 / 1.5: near-front / near-back)
const V = (sym, height, back, rounded) => ({ sym, height, back, rounded });
const vowels = [
  V("i", 0, 0, false), V("y", 0, 0, true), V("ɨ", 0, 1, false), V("ʉ", 0, 1, true), V("ɯ", 0, 2, false), V("u", 0, 2, true),
  V("ɪ", 1, 0.5, false), V("ʏ", 1, 0.5, true), V("ʊ", 1, 1.5, true),
  V("e", 2, 0, false), V("ø", 2, 0, true), V("ɘ", 2, 1, false), V("ɵ", 2, 1, true), V("ɤ", 2, 2, false), V("o", 2, 2, true),
  V("ə", 3, 1, null),
  V("ɛ", 4, 0, false), V("œ", 4, 0, true), V("ɜ", 4, 1, false), V("ɞ", 4, 1, true), V("ʌ", 4, 2, false), V("ɔ", 4, 2, true),
  V("æ", 5, 0, false), V("ɐ", 5, 1, null),
  V("a", 6, 0, false), V("ɶ", 6, 0, true), V("ɑ", 6, 2, false), V("ɒ", 6, 2, true),
];

const L = (sym, label, group) => ({ sym, label, ...(group ? { group } : {}) });
const nonpulmonic = [
  L("ʘ", "bilabial", "clicks"), L("ǀ", "dental", "clicks"), L("ǃ", "(post)alveolar", "clicks"),
  L("ǂ", "palatoalveolar", "clicks"), L("ǁ", "alveolar lateral", "clicks"),
  L("ɓ", "bilabial", "voiced implosives"), L("ɗ", "dental/alveolar", "voiced implosives"), L("ʄ", "palatal", "voiced implosives"),
  L("ɠ", "velar", "voiced implosives"), L("ʛ", "uvular", "voiced implosives"),
  L("ʼ", "ejective (after a consonant)", "ejectives"), L("pʼ", "bilabial", "ejectives"), L("tʼ", "dental/alveolar", "ejectives"),
  L("kʼ", "velar", "ejectives"), L("sʼ", "alveolar fricative", "ejectives"),
];
const other = [
  L("ʍ", "voiceless labial-velar fricative"), L("w", "voiced labial-velar approximant"),
  L("ɥ", "voiced labial-palatal approximant"), L("ʜ", "voiceless epiglottal fricative"),
  L("ʢ", "voiced epiglottal fricative"), L("ʡ", "epiglottal plosive"),
  L("ɕ", "alveolo-palatal fricative (voiceless)"), L("ʑ", "alveolo-palatal fricative (voiced)"),
  L("ɺ", "voiced alveolar lateral flap"), L("ɧ", "simultaneous ʃ and x"),
  L("t͡s", "affricate (tie bar)"), L("k͡p", "double articulation (tie bar)"),
];

const diacritics = [
  L("̥", "voiceless"), L("̊", "voiceless (above a descender)"), L("̬", "voiced"), L("ʰ", "aspirated"),
  L("̹", "more rounded"), L("̜", "less rounded"), L("̟", "advanced"), L("̠", "retracted"),
  L("̈", "centralized"), L("̽", "mid-centralized"), L("̩", "syllabic"), L("̍", "syllabic (above)"),
  L("̯", "non-syllabic"), L("˞", "rhoticity"), L("̤", "breathy voiced"), L("̰", "creaky voiced"),
  L("̼", "linguolabial"), L("ʷ", "labialized"), L("ʲ", "palatalized"), L("ˠ", "velarized"),
  L("ˤ", "pharyngealized"), L("̴", "velarized or pharyngealized"), L("̝", "raised"), L("̞", "lowered"),
  L("̘", "advanced tongue root"), L("̙", "retracted tongue root"), L("̪", "dental"), L("̺", "apical"),
  L("̻", "laminal"), L("̃", "nasalized"), L("ⁿ", "nasal release"), L("ˡ", "lateral release"),
  L("̚", "no audible release"), L("͡", "tie bar (joins two symbols)"),
];
const suprasegmentals = [
  L("ˈ", "primary stress"), L("ˌ", "secondary stress"), L("ː", "long"), L("ˑ", "half-long"),
  L("̆", "extra-short"), L("|", "minor (foot) group"), L("‖", "major (intonation) group"),
  L(".", "syllable break"), L("‿", "linking (absence of a break)"),
];
const tones = [
  L("̋", "extra high", "level"), L("́", "high", "level"), L("̄", "mid", "level"),
  L("̀", "low", "level"), L("̏", "extra low", "level"),
  L("˥", "extra high", "tone letters"), L("˦", "high", "tone letters"), L("˧", "mid", "tone letters"),
  L("˨", "low", "tone letters"), L("˩", "extra low", "tone letters"),
  L("̌", "rising", "contour"), L("̂", "falling", "contour"), L("᷄", "high rising", "contour"),
  L("᷅", "low rising", "contour"), L("᷈", "rising-falling", "contour"),
  L("˩˥", "rising", "tone letters"), L("˥˩", "falling", "tone letters"), L("˦˥", "high rising", "tone letters"),
  L("˩˨", "low rising", "tone letters"), L("˧˦˧", "rising-falling", "tone letters"),
  L("ꜜ", "downstep", "accent"), L("ꜛ", "upstep", "accent"), L("↗", "global rise", "accent"), L("↘", "global fall", "accent"),
];

export const CHART = { vowels, pulmonic, nonpulmonic, other, diacritics, suprasegmentals, tones };

/** Every symbol in the given sections (for checks). */
export function allSymbols(sections) {
  const out = [];
  for (const sec of sections) {
    if (sec === "vowels") out.push(...vowels.map(v => v.sym));
    else if (sec === "pulmonic") out.push(...pulmonic.cells.flat().filter(Array.isArray).flat().filter(Boolean));
    else out.push(...CHART[sec].map(d => d.sym));
  }
  return out;
}

/** Combining marks are shown on a dotted circle so they can be seen and tapped. */
export const isMark = s => /^[\p{Mn}]+$/u.test(s);
export const shown = s => (isMark(s) ? "◌" + s : s);
