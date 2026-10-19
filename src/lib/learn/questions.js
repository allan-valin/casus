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
