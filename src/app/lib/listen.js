/*
 * Listening and dictation (drills research 2026-10-20, items 7 and 9): a sentence from the Learn lessons (Tatoeba, the
 * course's own examples) is spoken and not shown; the learner picks its meaning, or types what was heard and sees,
 * word by word, what was right (Davis & Rinvolucri, Dictation, CUP 1988).
 */
import { sameAnswer } from './endings.js';

const WORD = /[\p{L}\p{M}\p{N}'’-]+/gu;

/** every sentence of the lessons that has a meaning, once each, in lesson order */
export function sentencePool(lessons) {
  const seen = new Set();
  const out = [];
  for (const l of lessons) for (const s of [...(l.examples ?? []), ...(l.more ?? [])]) {
    if (!s?.text || !s.en || s.text.length < 3 || seen.has(s.text)) continue;
    seen.add(s.text);
    out.push({ text: s.text, en: s.en, pt: s.pt ?? null });
  }
  return out;
}

const meaning = (s, ui) => (ui === 'pt' && s.pt ? s.pt : s.en);

/** sentence k of the pool with its meaning among up to four (the others: other sentences' meanings) */
export function meaningQuestion(pool, k, ui, random = Math.random) {
  const s = pool[k % pool.length];
  const answer = meaning(s, ui);
  const others = [...new Set(pool.map((x) => meaning(x, ui)).filter((m) => m !== answer))];
  for (let i = others.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
  const options = [answer, ...others.slice(0, 3)];
  for (let i = options.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
  return { text: s.text, answer, options };
}

/** each word of the sentence, marked right when the typed text has it in order (accents forgiven, like the other
 * typed drills); ok when every word is right, exact when the accents were too */
export function dictationDiff(expected, typed, lang) {
  const want = expected.match(WORD) ?? [];
  const got = (typed ?? '').match(WORD) ?? [];
  const same = (a, b) => sameAnswer(b, a, lang);
  // longest common subsequence, so a missed or extra word does not shift every word after it
  const n = want.length, m = got.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) L[i][j] = same(want[i], got[j]).ok ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const words = [];
  let exact = true;
  for (let i = 0, j = 0; i < n;) {
    const r = j < m ? same(want[i], got[j]) : { ok: false };
    if (r.ok && L[i][j] === L[i + 1][j + 1] + 1) { words.push({ w: want[i], ok: true }); exact &&= r.exact; i += 1; j += 1; }
    else if (j < m && L[i][j + 1] >= L[i + 1][j]) j += 1;
    else { words.push({ w: want[i], ok: false }); i += 1; }
  }
  const ok = words.every((w) => w.ok) && m <= n;
  return { words, ok, exact: ok && exact };
}
