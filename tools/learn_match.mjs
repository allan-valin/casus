/*
 * Lesson rules for the languages whose Learn lessons are written for Casus (tools/curricula/<code>.yml): a rule says
 * which words of a sentence show the lesson's point, on the reader's own analysis, so Tatoeba sentences can be
 * sorted into lessons and turned into exercises.
 *
 *   { seq: [cond, …], near: n, gap: k }   the conditions in order, at most n words between neighbours; the gap
 *                                          (the word the learner fills in) is the k-th condition's word
 *   cond: { pos, tense, aspect, person, number, gender, case, word: [surfaces], re: regex on the word,
 *           lemma: regex on the dictionary form of every reading, start: the sentence's first word,
 *           noTrail: no comma or stop right after it (Да, … is "yes"), not: cond }
 *   several rules: the first that matches (its index comes back as `rule`)
 *
 * A word fits a morphological condition only when every reading the reader keeps for it fits, so a gap is never
 * built on a guess.
 */
const FEATURES = ['pos', 'tense', 'aspect', 'person', 'number', 'gender', 'case', 'mood', 'voice'];
const lower = (s) => s.toLocaleLowerCase();

function fitsAnalysis(a, cond, lemmaOf) {
  for (const f of FEATURES) {
    if (cond[f] == null) continue;
    const want = Array.isArray(cond[f]) ? cond[f] : [cond[f]];
    if (!want.includes(a?.[f])) return false;
  }
  if (cond.lemma && !(lemmaOf && new RegExp(cond.lemma, 'u').test(lemmaOf(a?.lemma) ?? ''))) return false;
  if (cond.not && fitsAnalysis(a, cond.not, lemmaOf)) return false;
  return true;
}

export function fits(block, cond, lemmaOf = null) {
  if (cond.word && !cond.word.map(lower).includes(lower(block.token.surface))) return false;
  if (cond.re && !new RegExp(cond.re, 'iu').test(block.token.surface)) return false;
  if (cond.noTrail && block.token.trail) return false;
  const morph = FEATURES.some((f) => cond[f] != null) || cond.not || cond.lemma;
  if (!morph) return true;
  const cands = block.candidates ?? [];
  return cands.length > 0 && cands.every((c) => fitsAnalysis(c.analysis, cond, lemmaOf));
}

export function matchRule(blocks, rule, { lemmaOf = null } = {}) {
  if (Array.isArray(rule)) {
    for (let k = 0; k < rule.length; k += 1) { const m = matchRule(blocks, rule[k], { lemmaOf }); if (m) return { ...m, rule: k }; }
    return null;
  }
  const { seq, near = 0, gap = seq.length - 1 } = rule;
  const words = blocks.map((b, i) => [b, i]).filter(([b]) => /[\p{L}\p{N}]/u.test(b.token.surface));
  const ok = (j, k) => fits(words[j][0], seq[k], lemmaOf) && (!seq[k].start || j === 0);
  const from = (w, k, at) => {
    if (k === seq.length) return at;
    for (let j = w; j < words.length && j - w <= near; j += 1) {
      if (!ok(j, k)) continue;
      const done = from(j + 1, k + 1, [...at, words[j][1]]);
      if (done) return done;
    }
    return null;
  };
  for (let w = 0; w < words.length; w += 1) {
    if (!ok(w, 0)) continue;
    const at = from(w + 1, 1, [words[w][1]]);
    if (at) return { span: [at[gap], at[gap] + 1], gap: at[gap] };
  }
  return null;
}

/** the other forms of the answer's word, the forms nearest to it (most features shared) first, at most `max`. Left
 * out: a form that is another form with a short prefix (најдобар, подобар next to добар — another lesson's point);
 * with `same`, forms that differ from the answer in those features (an adjective lesson keeps the article as it is) */
export function formPool(rows, answer, code, decode, max = 5, same = []) {
  const mine = decode(code);
  const all = new Set(rows.map(([f]) => f));
  const prefixed = (f) => [...all].some((g) => g !== f && f.endsWith(g) && f.length - g.length <= 3);
  const score = (c) => { const a = decode(c); return Object.keys(mine).filter((k) => a[k] === mine[k]).length; };
  const keeps = (c) => { const a = decode(c); return same.every((k) => a[k] === mine[k]); };
  const best = new Map();
  for (const [form, ...codes] of rows) {
    if (form === answer || prefixed(form) || !codes.some(keeps)) continue;
    const s = Math.max(...codes.filter(keeps).map(score));
    if (!best.has(form) || best.get(form) < s) best.set(form, s);
  }
  return [...best].sort((x, y) => y[1] - x[1]).map(([f]) => f).slice(0, max);
}

// sentences a language course should not show (Tatoeba has some); checked on the English translation, and on the
// sentence itself for a few roots
const UNSUITABLE = /\b(sex|sexy|sexual|anal|fuck\w*|shit\w*|bitch\w*|whore\w*|slut\w*|dick|cock|pussy|cunt|penis|vagina|porn\w*|naked|nude|breasts?|boobs?|tits|orgasm\w*|rape\w*|masturbat\w*|horny|erection|condoms?|asshole|bastard)\b/i;
const UNSUITABLE_OWN = /(секс|јеб|курв|пичк|гомн|кур[аио]?\b|セックス|おっぱい|胸触|エッチ|ちんこ|まんこ)/iu;
export const unsuitable = (english, own = '') => UNSUITABLE.test(english ?? '') || UNSUITABLE_OWN.test(own);

/** a gap in a language written with spaces: the text before and after the gap's words, as written */
export function gapText(text, tokens, [a, b]) {
  const out = [[text.slice(0, tokens[a].start), null], ['＿＿', null], [text.slice(tokens[b - 1].end), null]];
  return out.filter(([t]) => t);
}

/** misspellings for a spelling question: each special letter swapped for its plain neighbours, one at a time */
export function spellingVariants(word, swaps) {
  const out = new Set();
  [...word].forEach((ch, i) => {
    const low = ch.toLocaleLowerCase();
    for (const alt of swaps[low] ?? []) {
      const rep = ch === low ? alt : alt.toLocaleUpperCase();
      out.add(word.slice(0, i) + rep + word.slice(i + ch.length));
    }
  });
  out.delete(word);
  return [...out];
}

/** the word with each of the other prefixes (comparison: голем, по-голем, најголем); capital kept on the first letter */
export function prefixVariants(word, prefixes) {
  const low = word.toLocaleLowerCase();
  const cap = word[0] !== low[0];
  const mine = [...prefixes].sort((a, b) => b.length - a.length).find((p) => low.startsWith(p)) ?? '';
  const base = low.slice(mine.length);
  return prefixes.filter((p) => p !== mine).map((p) => { const w = p + base; return cap ? w[0].toLocaleUpperCase() + w.slice(1) : w; });
}
