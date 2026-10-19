/* Practice questions for the Learn tab (Allan, 2026-10-19: practice questions for each lesson, and a practice section
 * for a chosen range of levels). Every question is multiple choice, with wrong answers of its own kind: meanings for
 * a meaning question, patterns for a gap, translations for a sentence, words for a word. Generated from the lesson
 * data, so each one can be checked. */

/** the part of a pattern that appears in a sentence: no 〜, no note in brackets, the first of alternatives */
export function coreOf(pattern) {
  return String(pattern).replace(/[（(][^）)]*[）)]/g, '').split(/[／/]/)[0].replace(/[〜~]/g, '').trim();
}

const meaningOf = (l, ui) => l.meaning?.[ui] ?? l.meaning?.en ?? '';
const grammarIn = (level) => level.units.filter((u) => u.kind === 'grammar').flatMap((u) => u.lessons);
const sample = (list, n, random) => { const a = [...list]; const out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(random() * a.length), 1)[0]); return out; };

export function lessonQuestions(lesson, level, { ui = 'en', random = Math.random } = {}) {
  const out = [];
  const base = { lesson: lesson.id };
  if (lesson.kind === 'grammar') {
    const others = grammarIn(level).filter((l) => l.id !== lesson.id);
    out.push({ ...base, type: 'meaning', prompt: lesson.pattern, answer: meaningOf(lesson, ui), pool: sample(others.map((l) => meaningOf(l, ui)).filter(Boolean), 8, random) });
    const core = coreOf(lesson.pattern);
    const cores = [...new Set(others.map((l) => coreOf(l.pattern)).filter((c) => c && c !== core))];
    for (const ex of lesson.examples ?? []) {
      if (core && ex.text.includes(core)) out.push({ ...base, type: 'gap', prompt: ex.text.replace(core, '＿＿'), answer: core, pool: sample(cores, 8, random), hint: ex.en });
      const sentences = others.flatMap((l) => l.examples ?? []).map((e) => e.en).filter((e) => e && e !== ex.en);
      if (ex.en) out.push({ ...base, type: 'translate', prompt: ex.text, answer: ex.en, pool: sample(sentences, 8, random) });
    }
  } else if (lesson.kind === 'vocab') {
    const ens = lesson.words.map((w) => w.en);
    const ws = lesson.words.map((w) => w.w);
    for (const w of lesson.words) {
      out.push({ ...base, type: 'word', prompt: w.w, hint: w.reading, answer: w.en, pool: ens });
      out.push({ ...base, type: 'word-back', prompt: w.en, answer: w.w, pool: ws });
    }
  } else if (lesson.kind === 'kanji') {
    const ens = lesson.kanji.map((k) => k.en);
    const readings = lesson.kanji.map((k) => (k.kun || k.on).split(';')[0].trim());
    for (const k of lesson.kanji) {
      out.push({ ...base, type: 'kanji', prompt: k.k, answer: k.en, pool: ens });
      const r = (k.kun || k.on).split(';')[0].trim();
      if (r) out.push({ ...base, type: 'kanji-reading', prompt: k.k, answer: r, pool: readings });
    }
  }
  return out;
}

/** questions from every lesson of the levels from…to, mixed, at most n */
export function practiceQuestions(learn, from, to, { n = 30, ui = 'en', random = Math.random } = {}) {
  const ids = learn.levels.map((l) => l.id);
  const [a, b] = [ids.indexOf(from), ids.indexOf(to)].sort((x, y) => x - y);
  const levels = learn.levels.slice(Math.max(0, a), b + 1);
  const all = levels.flatMap((level) => level.units.flatMap((u) => u.lessons).flatMap((lesson) => lessonQuestions(lesson, level, { ui, random })));
  return sample(all, n, random);
}

const sentenceOf = (furi) => furi.map(([t]) => t).join('');

/** wrong answers written like the answer: capitalised at the start of a sentence, and none that is the answer itself
 * in another case (ја beside Ја) */
function casedLike(answer, pool) {
  const low = (x) => x.toLocaleLowerCase();
  const cap = answer && answer[0] !== low(answer[0]);
  const out = [];
  for (const w of pool) {
    const v = cap ? w[0].toLocaleUpperCase() + w.slice(1) : w;
    if (low(v) !== low(answer) && !out.some((o) => low(o) === low(v))) out.push(v);
  }
  return out;
}

/** a lesson's question file ({ pools, qs }) as questions: the stored ones with their pools, and for every sentence with
 * its words two more — English → choose the Japanese, and put the words in order */
export function questionsFromFile(file, { lesson, random = Math.random, ui = 'en' } = {}) {
  // in a Portuguese interface a sentence Tatoeba also translated into Portuguese is asked in Portuguese
  const localise = (q) => (q.type === 'translate' && ui === 'pt' && q.pt ? { ...q, answer: q.pt, en: q.answer, lang: 'pt' } : q);
  const qs = (Array.isArray(file) ? file : (file?.qs ?? [])).map(localise);
  const pools = Array.isArray(file) ? {} : (file?.pools ?? {});
  const sentences = qs.filter((q) => q.type === 'translate');
  const ens = sentences.map((q) => q.answer);
  const jas = sentences.map((q) => sentenceOf(q.furi));
  const out = [];
  for (const q of qs) {
    const same = (x) => (x.lang ?? 'en') === (q.lang ?? 'en');
    const pool = q.pool ?? (q.type === 'gap' ? pools.gap : q.type === 'translate' ? sentences.filter((x) => same(x) && x.answer !== q.answer).map((x) => x.answer) : []) ?? [];
    out.push({ ...q, lesson, pool: q.type === 'gap' ? casedLike(q.answer, pool) : pool });
  }
  sentences.forEach((q, k) => {
    const ja = jas[k];
    out.push({ type: 'back', derivedFrom: q.source ?? 'book', lesson, prompt: q.answer, answer: ja, pool: jas.filter((j) => j !== ja) });
    if (q.tok?.length >= 3) {
      const tokens = [...q.tok];
      for (let i = tokens.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [tokens[i], tokens[j]] = [tokens[j], tokens[i]]; }
      // a language written with spaces is put together with spaces; the answer is the words, not the punctuation
      const sep = /\s/u.test(ja) ? ' ' : '';
      out.push({ type: 'order', derivedFrom: q.source ?? 'book', lesson, prompt: q.answer, tokens, answer: sep ? q.tok.join(sep) : ja, sep, furi: q.furi, roman: q.roman });
    }
  });
  return out;
}
