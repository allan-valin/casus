/*
 * The newer drills (docs/DRILLS-RESEARCH-2026-10-20.md, Allan: "implement all drill types for everything"), built
 * from data the site already has: the Learn exercise files (the exercise pass adds each gap's dictionary word and
 * each simple sentence's subject and object), sounds.json and bins.json (tools/build_drill_extras.py), and the
 * endings models (drills.json).
 */
import { drillTables } from './endings.js';

const textOf = (furi) => (furi ?? []).map(([t]) => t).join('');
const shuffled = (xs, random) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const meaningOf = (q, ui) => (ui === 'pt' && q.pt ? q.pt : q.en) ?? '';

/** item 4, inflection cloze: the sentence with its gap and the dictionary word; type the form (production practice,
 * Shintani, Li & Ellis 2013) */
export function clozeItems(qs, ui = 'en') {
  return qs.filter((q) => q.type === 'gap' && q.lemma && q.answer && q.lemma.toLocaleLowerCase() !== q.answer.toLocaleLowerCase())
    .map((q) => ({ prompt: `${textOf(q.furi)}   (${q.lemma})${meaningOf(q, ui) ? ` — ${meaningOf(q, ui)}` : ''}`, answer: q.answer }));
}

/** item 5, who did what to whom (processing instruction, VanPatten & Cadierno 1993): choose the doer; sentences
 * with the object first come first */
export function whoItems(qs, ui = 'en') {
  return qs.filter((q) => q.type === 'translate' && q.roles && q.tok)
    .sort((a, b) => Number(b.roles.objFirst) - Number(a.roles.objFirst))
    .map((q) => ({ prompt: textOf(q.furi), answer: q.tok[q.roles.sbj], pool: [q.tok[q.roles.obj]], meaning: meaningOf(q, ui) }));
}

/** item 10, spot and fix the error: one wrong answer of a gap question put in the gap; the learner taps the wrong
 * word, then sees the right one */
export function spotItems(qs, random = Math.random) {
  const out = [];
  for (const q of qs) {
    if (q.type !== 'gap' || !q.answer || !q.pool?.length) continue;
    const at = (q.furi ?? []).findIndex(([t]) => t === '＿＿');
    if (at < 0) continue;
    const wrongs = q.pool.filter((w) => w.toLocaleLowerCase() !== q.answer.toLocaleLowerCase() && !/\s/u.test(w));
    if (!wrongs.length || /\s/u.test(q.answer)) continue;
    const wrong = wrongs[Math.floor(random() * wrongs.length)];
    const words = [];
    const push = (text) => { for (const w of text.split(/\s+/u).filter(Boolean)) words.push({ text: w, bad: false }); };
    push(textOf(q.furi.slice(0, at)));
    words.push({ text: wrong, bad: true });
    push(textOf(q.furi.slice(at + 1)));
    out.push({ words, wrong, right: q.answer, meaning: q.en ?? '' });
  }
  return out;
}

/** item 12, sort into bins: each frequent noun to its gender */
export function binItems(bins, names) {
  const all = bins.bins.map((b) => names[b] ?? b);
  return bins.items.map((x) => ({ prompt: x.w, hint: x.en, answer: names[x.bin] ?? x.bin, pool: all.filter((n) => n !== (names[x.bin] ?? x.bin)) }));
}

function partners(sounds) {
  const p = new Map();
  for (const [a, b] of sounds.pairs ?? []) { p.set(a, [...(p.get(a) ?? []), b]); p.set(b, [...(p.get(b) ?? []), a]); }
  return p;
}

/** item 14, sound ↔ spelling: IPA → word ('word') or word → IPA ('ipa'); a minimal-pair partner is always among the
 * wrong answers when the word has one */
export function soundItems(sounds, dir = 'word') {
  const ws = sounds.words ?? [];
  const p = partners(sounds);
  return ws.map((x, i) => {
    const near = (p.get(i) ?? []).map((j) => ws[j]);
    const others = ws.filter((y, j) => j !== i && !near.includes(y)).filter((_, k) => (k * 7 + i) % 11 < 3).slice(0, 6);
    const key = dir === 'ipa' ? 'ipa' : 'w';
    return { prompt: dir === 'ipa' ? x.w : x.ipa, hint: x.en, answer: x[key], pool: [...new Set([...near, ...others].map((y) => y[key]))].filter((v) => v !== x[key]) };
  });
}

/** item 8, minimal-pair listening (high-variability phonetic training, Thomson 2018): one word of the pair is
 * spoken; which was it? */
export function pairItems(sounds, random = Math.random) {
  const ws = sounds.words ?? [];
  return (sounds.pairs ?? []).map(([a, b]) => ({ options: [ws[a], ws[b]], say: random() < 0.5 ? ws[a] : ws[b] }));
}

/** item 15, matching grid: rounds of n word–meaning pairs, the meanings shuffled */
export function matchRounds(items, n = 5, random = Math.random) {
  const out = [];
  for (let k = 0; k + n <= items.length; k += n) {
    const left = items.slice(k, k + n);
    out.push({ left, right: shuffled(left, random) });
  }
  return out;
}

/** item 11, agreement builder: an adjective and a noun model into one case and number — the noun's gender picks
 * the adjective's form. caseName / numberName say them in the interface language. */
export function agreementItems(models, lang, caseName, numberName) {
  // (the first table: an adjective's positive degree; a noun's only one)
  const cells = (m) => (drillTables(m, lang)[0]?.items ?? []).map((i) => ({ form: i.form, ...i.analysis }));
  const adjs = models.filter((m) => m.pos === 'adj').map((m) => ({ m, cs: cells(m) })).filter((x) => x.cs.length);
  const nouns = models.filter((m) => m.pos === 'noun').map((m) => ({ m, cs: cells(m) })).filter((x) => x.cs.length);
  const out = [];
  for (const { m: am, cs: acs } of adjs) {
    for (const { m: nm, cs: ncs } of nouns) {
      const genders = [...new Set(ncs.map((c) => c.gender).filter((g) => g && g !== 'x'))];
      if (genders.length !== 1) continue;
      const g = genders[0];
      for (const n of ncs) {
        // one form each, or no fair question (a paradigm that keeps definite and indefinite, strong and weak, or
        // positive and superlative in one cell)
        if (new Set(ncs.filter((x) => x.case === n.case && x.number === n.number).map((x) => x.form)).size !== 1) continue;
        const fits = acs.filter((a) => a.case === n.case && a.number === n.number && (a.gender === g || a.gender === 'x' || !a.gender));
        if (new Set(fits.map((a) => a.form)).size !== 1) continue;
        const right = new Set(fits.map((a) => a.form));
        const answer = `${fits[0].form} ${n.form}`;
        const pool = [...new Set(acs.map((a) => a.form))].filter((f) => !right.has(f)).map((f) => `${f} ${n.form}`);
        if (!pool.length) continue;
        out.push({ prompt: `${am.dict_form ?? am.headword} + ${nm.dict_form ?? nm.headword} → ${caseName(n.case)} ${numberName(n.number)}`, answer, pool });
      }
    }
  }
  return out;
}

/** n grammar lessons of the Learn tab at random (word lists left out) and their questions: the sentences the cloze,
 * who-did-what, spot-the-error and shadowing drills use */
export async function learnSample(loadData, random = Math.random, n = 16) {
  const index = await loadData('learn').catch(() => null);
  const ids = (index?.levels ?? []).filter((lv) => !lv.reference).flatMap((lv) => lv.topics.filter((tp) => tp.kind !== 'vocab').flatMap((tp) => tp.lessons.map((l) => l.id)));
  const pick = shuffled(ids, random).slice(0, n);
  const [lessons, files] = await Promise.all([
    Promise.all(pick.map((id) => loadData(`learn/${id}`).catch(() => null))),
    Promise.all(pick.map((id) => loadData(`learn/q-${id}`).catch(() => null))),
  ]);
  return { lessons: lessons.filter(Boolean), qs: files.filter(Boolean).flatMap((f) => f.qs ?? []) };
}
