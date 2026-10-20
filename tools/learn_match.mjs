/*
 * Lesson rules for the languages whose Learn lessons are written for Casus (tools/curricula/<code>.yml): a rule says
 * which words of a sentence show the lesson's point, on the reader's own analysis, so Tatoeba sentences can be
 * sorted into lessons and turned into exercises.
 *
 *   { seq: [cond, …], near: n, gap: k }   the conditions in order, at most n words between neighbours; the gap
 *                                          (the word the learner fills in) is the k-th condition's word
 *   cond: { pos, tense, aspect, person, number, gender, case, word: [surfaces], re: regex on the word,
 *           lemma: regex on the dictionary form of every reading, start: the sentence's first word,
 *           notStart: not the first word, noTrail: no comma or stop right after it (Да, … is "yes"), trail: this
 *           punctuation right after it (a comma before a relative clause), dict: regex on the dictionary form as printed
 *           (Arabic: "دَرَّسَ (form II)"), not: cond }
 *   several rules: the first that matches (its index comes back as `rule`); words and re compare after `norm`
 *   (lower case; Arabic: the bare letters, so rules are written without vowels)
 *
 * A word fits a morphological condition only when every reading the reader keeps for it fits, so a gap is never
 * built on a guess.
 */
const FEATURES = ['pos', 'tense', 'aspect', 'person', 'number', 'gender', 'case', 'mood', 'voice', 'state', 'degree', 'conj', 'infl', 'form', 'poss', 'polarity'];
const lower = (s) => s.toLocaleLowerCase();

// a rule's patterns compiled once (the exercise pass tries every rule on every word of hundreds of thousands of
// sentences)
const COMPILED = new WeakMap();
function compiled(cond, field, flags) {
  let m = COMPILED.get(cond);
  if (!m) { m = {}; COMPILED.set(cond, m); }
  return (m[field] ??= new RegExp(cond[field], flags));
}

function fitsAnalysis(a, cond, lemmaOf, dictOf) {
  for (const f of FEATURES) {
    if (cond[f] == null) continue;
    const want = Array.isArray(cond[f]) ? cond[f] : [cond[f]];
    if (!want.includes(a?.[f])) return false;
  }
  if (cond.lemma && !(lemmaOf && compiled(cond, 'lemma', 'u').test(lemmaOf(a?.lemma) ?? ''))) return false;
  if (cond.dict && !(dictOf && compiled(cond, 'dict', 'u').test(dictOf(a?.lemma) ?? ''))) return false;
  // (a `not` of words or patterns only is checked on the word itself, in fits)
  if (cond.not && morphOf(cond.not) && fitsAnalysis(a, cond.not, lemmaOf, dictOf)) return false;
  return true;
}

const morphOf = (cond) => FEATURES.some((f) => cond[f] != null) || cond.not || cond.lemma || cond.dict;

export function fits(block, cond, lemmaOf = null, dictOf = null, norm = lower) {
  if (cond.not && (cond.not.word || cond.not.re) && !morphOf(cond.not) && fits(block, cond.not, lemmaOf, dictOf, norm)) return false;
  if (cond.word && !cond.word.map(norm).includes(norm(block.token.surface))) return false;
  // (on the key and on the word as written: a key may strip accents the pattern names, Modern Greek -άς)
  if (cond.re) {
    const re = compiled(cond, 're', 'iu');
    const s = block.token.surface;
    if (!re.test(norm === lower ? s : norm(s)) && !re.test(s.normalize('NFC').toLocaleLowerCase())) return false;
  }
  if (cond.noTrail && block.token.trail) return false;
  if (cond.trail && ![...cond.trail].some((ch) => (block.token.trail ?? '').includes(ch))) return false;   // any of these marks
  if (cond.unknown && (block.candidates ?? []).length) return false;
  const morph = FEATURES.some((f) => cond[f] != null) || (cond.not && morphOf(cond.not)) || cond.lemma || cond.dict;
  if (!morph) return true;
  const cands = block.candidates ?? [];
  return cands.length > 0 && cands.every((c) => fitsAnalysis(c.analysis, cond, lemmaOf, dictOf));
}

export function matchRule(blocks, rule, { lemmaOf = null, dictOf = null, norm = lower } = {}) {
  if (Array.isArray(rule)) {
    for (let k = 0; k < rule.length; k += 1) { const m = matchRule(blocks, rule[k], { lemmaOf, dictOf, norm }); if (m) return { ...m, rule: k }; }
    return null;
  }
  const { seq, near = 0, gap = seq.length - 1 } = rule;
  const words = blocks.map((b, i) => [b, i]).filter(([b]) => /[\p{L}\p{N}]/u.test(b.token.surface));
  const ok = (j, k) => fits(words[j][0], seq[k], lemmaOf, dictOf, norm) && (!seq[k].start || j === 0) && (!seq[k].notStart || j > 0);
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
    // the answer itself, a variant of it in the same slot (ἐστί / ἐστίν), a prefixed form, a form outside `same`
    if (form === answer || codes.includes(code) || prefixed(form) || !codes.some(keeps)) continue;
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

/** the vowelled form every reading of a word agrees on (Arabic: the reader's `marked`), or null */
export function markOf(block) {
  const marks = new Set((block.candidates ?? []).map((c) => c.analysis?.marked).filter(Boolean));
  return marks.size === 1 ? [...marks][0] : null;
}

/** the text with each word replaced where `replace(i)` gives something (vowels), optionally with a gap over [a, b) */
export function rewrite(text, tokens, replace, gap = null) {
  const parts = [];
  let at = 0;
  let cur = '';
  tokens.forEach((t, i) => {
    cur += text.slice(at, t.start);
    at = t.end;
    if (gap && i >= gap[0] && i < gap[1]) {
      if (i === gap[0]) { parts.push([cur, null]); parts.push(['＿＿', null]); cur = ''; }
      return;
    }
    cur += replace(i) ?? text.slice(t.start, t.end);
  });
  cur += text.slice(at);
  parts.push([cur, null]);
  return parts.filter(([s]) => s);
}

/** the word with each of the other suffixes (possessives: كتابي, كتابك, كتابه…), vowel marks left aside; the longest
 * suffix it has comes off; none when it has none of them */
export function suffixVariants(word, suffixes) {
  // the word as written when a suffix fits it (Devanagari: the vowel signs are the suffix); else without vowel marks
  const longest = [...suffixes].sort((a, b) => b.length - a.length);
  const bare = !/[\u0600-\u06ff]/u.test(word) && longest.some((x) => word.endsWith(x)) ? word : word.replace(/\p{M}/gu, '');   // (Arabic: always bare)
  const mine = longest.find((x) => bare.endsWith(x));
  if (!mine) return [];
  const stem = bare.slice(0, bare.length - mine.length);
  return suffixes.filter((x) => x !== mine).map((x) => stem + x);
}

/** the paradigm row a written word stands for: the same letters after `norm` (Arabic: without vowels), and a code
 * whose features agree with the word's readings. When its readings lead to different forms (unvowelled صغيرة: nom.,
 * acc. or gen.) there is no row: a vowelled answer must be the one the sentence needs, not one of several */
export function rowFor(rows, surface, analyses, decode, norm) {
  const key = norm(surface);
  const agrees = (f, a) => Object.keys(f).every((k) => f[k] == null || a[k] == null || f[k] === a[k] || f[k] === 'x');
  const found = new Map();
  for (const a of analyses) {
    const row = rows.find((r) => norm(r[0]) === key && r.slice(1).some((c) => agrees(decode(c), a)));
    if (row) found.set(row[0], row);
  }
  return found.size === 1 ? [...found.values()][0] : null;
}

/** Latin u where it is a consonant, written v as most modern texts do: at the start before a vowel, and between vowels
 * (uideor → videor, nouus → novus); tuus, sua stay */
export function consonantV(word) {
  return word.replace(/(^|[aeiouāēīōū])([uU])(?=[aeiouāēīōū])/gu, (m, before, u) => before + (u === 'U' ? 'V' : 'v'));
}

/** where the sentence spells the answer differently from its paradigm row (silvam / siluam), the wrong answers get the
 * same letters at the same places */
export function followSpelling(written, row, wrong) {
  const at = [];
  for (let i = 0; i < Math.min(written.length, row.length); i += 1) if (written[i].toLowerCase() !== row[i].toLowerCase()) at.push([i, written[i].toLowerCase(), row[i].toLowerCase()]);
  return wrong.map((w) => [...w].map((ch, i) => { const d = at.find(([k, , from]) => k === i && ch.toLowerCase() === from); return d ? d[1] : ch; }).join(''));
}

/** generated wrong answers (suffix or prefix variants) that real text has (a lesson asks for it with
 * `attested: true` — Finnish -ttiin, not the invented -tiin; Greek πρέπεις from the impersonal πρέπει is never seen) */
export function preferAttested(forms, seen, norm = lower) {
  return forms.filter((f) => seen.has(norm(f)));
}

/** a name in an inflecting language: capitalised and starting with one of the course's names (Tomille, Marin) */
export function looksLikeName(surface, names) {
  return surface[0] !== surface[0].toLocaleLowerCase() && names.some((n) => surface.startsWith(n));
}

/** wrong answers without an ending the answer lacks (Finnish possessive suffixes, which the paradigm data files
 * under plain cases: elämieni as a genitive singular) */
export function dropMarked(forms, answer, re) {
  const marked = new RegExp(re, 'u');
  return marked.test(answer) ? forms : forms.filter((f) => !marked.test(f));
}

/** wrong answers less the answer's partner in the other gender (Polish popełniłem / popełniłam, Czech četl / četla:
 * with the speaker unseen both are right); pairs: [[masculine ending, feminine ending], …], longest first wins */
export function dropPartners(forms, answer, pairs) {
  const low = answer.toLocaleLowerCase();
  const partners = new Set();
  for (const [a, b] of [...pairs].sort((x, y) => Math.max(y[0].length, y[1].length) - Math.max(x[0].length, x[1].length))) {
    if (low.endsWith(a)) partners.add(low.slice(0, -a.length) + b);
    if (low.endsWith(b)) partners.add(low.slice(0, -b.length) + a);
  }
  return forms.filter((f) => !partners.has(f.toLocaleLowerCase()));
}

/** wrong answers that share the answer's stem: all but its last `tail` letters (at least three) — a person drill offers
 * inanıyorum for inanıyoruz, never a derived inanabiliyordunuz */
export function shareStem(forms, answer, tail) {
  const stem = answer.toLocaleLowerCase().slice(0, Math.max(3, answer.length - tail));
  return forms.filter((f) => f.toLocaleLowerCase().startsWith(stem));
}

/** who did what to whom (processing instruction, VanPatten & Cadierno 1993): the one noun or pronoun every reading of
 * which is nominative (English: subject case) and the one every reading of which is accusative (object case), in a
 * sentence with a verb; null when either is missing, doubled or uncertain. objFirst: the object comes first, the
 * sentences that teach the point (Den Hund sieht der Mann). */
// accusatives of time (den ganzen Tag, allan morguninn, всю ночь, totam noctem) are no objects
const TIME = /^(klukka|uhr|morgunn|dagur|kvöld|nótt|ár|vika|stund|tími|mánuður|tag|morgen|abend|nacht|jahr|woche|monat|stunde|zeit|день|ночь|утро|вечер|год|неделя|месяц|час|время|минута|dies|nox|annus|hora|tempus|mensis|ἡμέρα|νύξ|ἔτος|χρόνος|ὥρα|μήν|dzień|noc|rok|tydzień|godzina|miesiąc|den|týden|hodina|měsíc|päivä|yö|vuosi|viikko|tunti|aika|kuukausi|nap|éj|év|hét|óra|idő|hónap|gün|gece|yıl|hafta|saat|ay|μέρα|νύχτα|χρόνο|εβδομάδα|ώρα|μήνας|يوم|ليلة|سنة|أسبوع|ساعة|وقت|شهر|day|night|year|week|hour|time|month|morning|evening)$/u;

export function rolesOf(blocks, { lemmaOf = null } = {}) {
  const sure = (b, cases) => ['noun', 'pron'].includes(b.candidates?.[0]?.analysis?.pos) && b.candidates.every((c) => cases.includes(c.analysis?.case) && ['noun', 'pron'].includes(c.analysis?.pos));
  const sbj = blocks.map((b, i) => (sure(b, ['nom', 'sbj']) ? i : -1)).filter((i) => i >= 0);
  const obj = blocks.map((b, i) => (sure(b, ['acc', 'obj']) ? i : -1)).filter((i) => i >= 0);
  // one clause: one verb, no comma or colon inside, and the object not governed by a preposition (á sjálfa sig)
  const verbs = blocks.filter((b) => b.candidates?.length && b.candidates.some((c) => c.analysis?.pos === 'verb')).length;
  const inner = blocks.slice(0, -1).some((b) => /[,;:–—]/u.test(b.token.trail ?? '') || /^[,;:–—"„“«»]$/u.test(b.token.surface));
  const unread = blocks.some((b) => /[\p{L}]/u.test(b.token.surface) && !b.candidates?.length);
  const conj = blocks.some((b) => b.candidates?.length && b.candidates.every((c) => c.analysis?.pos === 'conj'));
  if (sbj.length !== 1 || obj.length !== 1 || verbs !== 1 || inner || unread || conj) return null;
  if (lemmaOf && blocks[obj[0]].candidates.some((c) => TIME.test((lemmaOf(c.analysis?.lemma) ?? '').toLocaleLowerCase()))) return null;
  const words = blocks.map((b, i) => [b, i]).filter(([b]) => /[\p{L}\p{N}]/u.test(b.token.surface));
  const afterPrep = (k) => { const at = words.findIndex(([, i]) => i === k); return words.slice(Math.max(0, at - 3), at).some(([b]) => b.candidates?.some((c) => c.analysis?.pos === 'prep')); };
  if (afterPrep(obj[0]) || afterPrep(sbj[0])) return null;
  return { sbj: sbj[0], obj: obj[0], objFirst: obj[0] < sbj[0] };
}
