/* The pronunciation trainer's logic: the Wiktionary IPA a sentence should have, the sounds of a
 * transcription, and the alignment of what was expected with what the phone recogniser heard. */

const MARKS = new Set([...'ˈˌ.‿/[]()-|‖⁰¹²³⁴⁵⁶⁷⁸⁹']);
const JOINS = /^[\p{Mn}ːˑʰʲʷˠˤⁿˡʼ˞]$/u;
const TIE = /[͜͡]/u;

/** the sounds of a transcription: each letter with its diacritics, length marks and tie bars */
export function segments(ipa) {
  const out = [];
  for (const ch of (ipa ?? '').normalize('NFD')) {
    if (MARKS.has(ch) || /\s/.test(ch)) continue;
    const last = out[out.length - 1];
    if (last !== undefined && (JOINS.test(ch) || TIE.test(ch) || TIE.test(last.slice(-1)))) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out.map((s) => s.normalize('NFC'));
}

const key = (w) => w.normalize('NFC').toLowerCase();
// the same word without diacritics (Arabic vowel signs, Latin macrons, accents): a second chance to match
const bare = (w) => w.normalize('NFD').replace(/[\p{Mn}\u0640]/gu, '').normalize('NFC').toLowerCase();

/** headword (lower case) → its first IPA, from the language's lemmas.json and ipa.json */
export function buildIpaIndex(lemmas, ipa, preferred = []) {
  const index = new Map();
  // every Wiktionary variant of a headword, with its tags (Austria, Switzerland …): offered, and scored against the
  // closest (Allan, 2026-10-22)
  index.variantsOf = new Map();
  for (const [id, variants] of Object.entries(ipa ?? {})) {
    const hw = lemmas?.[id]?.headword;
    if (!hw || !variants?.length) continue;
    const k = key(hw), ipaOf = pick(variants, preferred).ipa;
    if (!index.has(k)) index.set(k, ipaOf);
    if (variants.length > 1 && !index.variantsOf.has(k)) index.variantsOf.set(k, variants);
    const b = `~${bare(hw)}`;
    if (!index.has(b)) index.set(b, ipaOf);
  }
  return index;
}

function pick(variants, preferred) {
  for (const tag of preferred) { const hit = variants.find((v) => v.tags?.includes(tag)); if (hit) return hit; }
  return variants[0];
}

/** the words of a sentence (letters, marks, inner apostrophes and hyphens) */
export function words(text) {
  return (text ?? '').normalize('NFC').match(/[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu) ?? [];
}

/** each word with its expected IPA: exact (the word is a headword), lemma (an inflected form: the lemma's IPA,
 * approximate) or none */
export async function expectedFor(text, { index, lookup, lemmas, ipa, preferred = [], noSpaces = false, formIpa = null, course = null }) {
  // a course line's own sounds (Japanese: computed by the build from our kana, tools/ja_phonemes.py) beat any cut into
  // headwords — 日本 is not 日 + 本, and conjugated verbs have no headword (Allan, 2026-10-27)
  if (course) return [{ word: text, ipa: course.replace(/[↑↓#,.?!\s]/gu, ''), source: 'course' }];
  const out = [];
  for (const word of noSpaces ? greedyWords(text, index) : words(text)) {
    const k = key(word);
    const hit = index.get(k) ?? index.get(`~${bare(word)}`);
    if (hit) { const variants = index.variantsOf?.get(k); out.push({ word, ipa: hit, source: 'exact', ...(variants ? { variants } : {}) }); continue; }
    let found = null;
    for (const a of (await lookup?.(k)) ?? []) {
      const v = ipa?.[a.lemma];
      if (v?.length) { found = { word, ipa: pick(v, preferred).ipa, source: 'lemma', lemma: lemmas?.[a.lemma]?.headword ?? '' }; break; }
    }
    // the form's own transcription, generated (espeak-ng calibrated on Wiktionary: tools/form_ipa.py) — an inflected
    // form is closer to its own IPA than to its lemma's (Allan, 2026-10-22: "it does not conjugate verbs")
    const own = await formIpa?.(k).catch?.(() => null) ?? null;
    if (own) found = { word, ipa: own, source: 'form', lemma: found?.lemma ?? '' };
    out.push(found ?? { word, ipa: null, source: 'none' });
  }
  return out;
}

/** a text without spaces (Japanese, Chinese) cut into the longest headwords the index knows; unknown characters
 * stay one by one, joined into one word while unknown */
export function greedyWords(text, index, max = 8) {
  const out = [];
  for (const run of words(text)) {
    let unknown = '';
    for (let i = 0; i < run.length;) {
      let n = Math.min(max, run.length - i);
      while (n > 0 && !index.has(key(run.slice(i, i + n)))) n--;
      if (n === 0) { unknown += run[i]; i++; continue; }
      if (unknown) { out.push(unknown); unknown = ''; }
      out.push(run.slice(i, i + n)); i += n;
    }
    if (unknown) out.push(unknown);
  }
  return out;
}

/** the sample recording of a sound: itself, without tie bars, or its bare letter; null when none */
export function sampleFor(sym, index) {
  const tries = [sym, sym.replace(TIE, ''), sym.replace(/[\u0361\u035C]/gu, '').normalize('NFD').replace(/[\p{Mn}ːˑ]/gu, '').normalize('NFC'), base(sym)];
  for (const k of tries) if (index?.[k]) return index[k].f;
  return null;
}

/** the sounds to compare against: exact words give their sounds, the others a wildcard '*' */
export function expectedSounds(expected) {
  // a form's generated IPA is compared too (it is that form's own); a lemma's IPA for an inflected form is not
  return expected.flatMap((w) => (w.source === 'exact' || w.source === 'wikt' || w.source === 'form' || w.source === 'course' ? segments(w.ipa) : ['*']));
}

/** each word with variants set to the one that makes the whole sentence closest to what was heard (one word at a time,
 * the others held) — `chosen` names the variant's tags */
export function bestVariants(expected, heard) {
  let cur = expected.map((w) => ({ ...w }));
  const total = (list) => score(align(expectedSounds(list), heard)) ?? -1;
  cur.forEach((w, i) => {
    if (!w.variants?.length) return;
    let best = total(cur), keep = w.ipa, tags = w.chosen ?? w.variants.find((v) => v.ipa === w.ipa)?.tags ?? [];
    for (const v of w.variants) {
      const trial = cur.map((x, j) => (j === i ? { ...x, ipa: v.ipa } : x));
      const s = total(trial);
      if (s > best) { best = s; keep = v.ipa; tags = v.tags ?? []; }
    }
    cur = cur.map((x, j) => (j === i ? { ...x, ipa: keep, chosen: tags } : x));
  });
  return cur;
}

const base = (s) => s.normalize('NFD').replace(/[\p{Mn}ːˑʰʲʷˠˤⁿˡʼ˞]/gu, '').replace('g', 'ɡ');
const NEAR = [['e', 'ɛ', 'e̞', 'ɘ'], ['o', 'ɔ', 'o̞', 'ɵ'], ['i', 'ɪ', 'ɨ'], ['u', 'ʊ', 'ʉ'], ['a', 'ɐ', 'ɑ', 'ä', 'æ'],
  ['ə', 'ɐ', 'ɜ', 'ɘ'], ['y', 'ʏ'], ['ø', 'œ'], ['r', 'ɾ', 'ʁ', 'ʀ', 'ɹ', 'χ', 'ɻ'], ['l', 'ɫ', 'ɭ'], ['n', 'ŋ', 'ɲ']];

/** 0 same, .5 near (a diacritic, length or a close neighbour), 1 different */
export function cost(a, b) {
  const plain = (x) => x.normalize('NFD').replace(/[\u0361\u035C\u032F]/gu, '').normalize('NFC');
  if (a === b || plain(a) === plain(b)) return 0;
  const x = base(a), y = base(b);
  if (x === y) return 0.5;
  if (NEAR.some((g) => g.includes(x) && g.includes(y))) return 0.5;
  // connected speech (Wiktionary gives careful standard speech): a vowel reduced to a schwa, a voicing change, a flap
  if (VOWEL.test(x) && REDUCED.includes(y)) return 0.5;
  if (VOICING.some(([v, u]) => (x === v && y === u) || (x === u && y === v))) return 0.5;
  if ((x === 't' || x === 'd') && y === 'ɾ') return 0.5;
  return 1;
}

const VOWEL = /^[aeiouyɑɐɒæɛɜəɘɞɤɨɪɯɵɶʉʊʌʏøœ]+$/u;
const REDUCED = ['ə', 'ɐ'];
const VOICING = [['b', 'p'], ['d', 't'], ['ɡ', 'k'], ['v', 'f'], ['z', 's'], ['ʒ', 'ʃ'], ['ð', 'θ'], ['dʒ', 'tʃ'], ['dz', 'ts']];
// sounds fast speech drops or slips in: their absence or presence costs half
const WEAK = ['ə', 'ɐ', 'ʔ', 'h'];
const weak = (s) => WEAK.includes(base(s));

/** align expected sounds ('*' = anything) with heard ones: [{ exp, got, op }] with op ok, near, sub, del, ins, wild */
export function align(exp, got) {
  const n = exp.length, m = got.length, INF = 1e9;
  const D = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF));
  const B = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  D[0][0] = 0;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      const here = D[i][j];
      if (here === INF) continue;
      const relax = (a, b, c, op) => { if (here + c < D[a][b]) { D[a][b] = here + c; B[a][b] = [i, j, op]; } };
      if (i < n && exp[i] === '*') {
        relax(i + 1, j, 0, 'skip');
        if (j < m) relax(i, j + 1, 0, 'wild');
        continue;
      }
      if (i < n && j < m) { const c = cost(exp[i], got[j]); relax(i + 1, j + 1, c, c === 0 ? 'ok' : c < 1 ? 'near' : 'sub'); }
      if (i < n) relax(i + 1, j, weak(exp[i]) ? 0.5 : 1, weak(exp[i]) ? 'near' : 'del');
      if (j < m) relax(i, j + 1, weak(got[j]) ? 0.5 : 1, weak(got[j]) ? 'near' : 'ins');
    }
  }
  const out = [];
  for (let i = n, j = m; i || j;) {
    const [pi, pj, op] = B[i][j];
    // a near that is a dropped or slipped-in weak sound has only one side
    const kind = op === 'near' && pi === i ? 'ins' : op === 'near' && pj === j ? 'del' : op;
    if (op !== 'skip') out.push({ exp: kind === 'ins' || kind === 'wild' ? null : exp[pi], got: kind === 'del' ? null : got[pj], ...(kind === 'del' ? {} : { gi: pj }), op });
    i = pi; j = pj;
  }
  return out.reverse();
}

/** the recogniser marks each sound with a CTC spike, often one 20 ms frame: too short to hear. Each clip runs instead
 * from halfway after the previous sound to halfway before the next (0.1 s before the first and after the last), and
 * is at least 0.15 s long (Allan, 2026-10-20: "when I click my sounds it barely plays anything") */
export function widenSlices(heard, total) {
  const MIN = 0.15, EDGE = 0.1;
  return heard.map((h, k) => {
    let start = k ? (heard[k - 1].end + h.start) / 2 : Math.max(0, h.start - EDGE);
    let end = k < heard.length - 1 ? (h.end + heard[k + 1].start) / 2 : Math.min(total, h.end + EDGE);
    if (end - start < MIN) { const pad = (MIN - (end - start)) / 2; start = Math.max(0, start - pad); end = Math.min(total, end + pad); }
    return { ...h, start, end };
  });
}

/** share (0–100) of the expected sounds said right, near counting half; null when none could be compared */
export function score(pairs) {
  const counted = pairs.filter((p) => p.exp != null && p.op !== 'wild');   // only the expected sounds count
  if (!counted.length) return null;
  const got = counted.reduce((s, p) => s + (p.op === 'ok' ? 1 : p.op === 'near' ? 0.5 : 0), 0);
  return Math.round((100 * got) / counted.length);
}

const PROMPTS = {
  en: (o) => `I am learning ${o.language}. I tried to say this sentence:\n\n${o.sentence}\n\nThe expected pronunciation (IPA from Wiktionary, word by word) is:\n${o.expected}\n\nA phone recogniser heard me say (IPA, sound by sound):\n${o.heard}\n\nPlease compare the two, tell me which sounds I got wrong or left out, and teach me how to pronounce them better: where the tongue and lips go, whether the sound is voiced, a similar sound from English or Portuguese if there is one, and a short exercise. Keep in mind that the recogniser makes mistakes too, so point out anything that looks like its error rather than mine.`,
  pt: (o) => `Estou aprendendo ${o.language}. Tentei dizer esta frase:\n\n${o.sentence}\n\nA pronúncia esperada (IPA do Wikcionário, palavra por palavra) é:\n${o.expected}\n\nUm reconhecedor de fones ouviu isto (IPA, som por som):\n${o.heard}\n\nCompare as duas, diga quais sons eu errei ou deixei de fora e me ensine a pronunciá-los melhor: onde ficam a língua e os lábios, se o som é sonoro, um som parecido do português se houver, e um exercício curto. Lembre que o reconhecedor também erra: aponte o que parecer erro dele e não meu.`,
  de: (o) => `Ich lerne ${o.language}. Ich habe versucht, diesen Satz zu sagen:\n\n${o.sentence}\n\nDie erwartete Aussprache (IPA aus dem Wiktionary, Wort für Wort) ist:\n${o.expected}\n\nEin Phonerkenner hat Folgendes gehört (IPA, Laut für Laut):\n${o.heard}\n\nBitte vergleiche beides, sag mir, welche Laute ich falsch gemacht oder ausgelassen habe, und bring mir bei, wie ich sie besser ausspreche: wo Zunge und Lippen sind, ob der Laut stimmhaft ist, ein ähnlicher Laut aus dem Deutschen, falls es einen gibt, und eine kurze Übung. Denk daran, dass auch der Erkenner Fehler macht: weise auf das hin, was eher sein Fehler als meiner ist.`,
  mk: (o) => `Учам ${o.language}. Се обидов да ја кажам оваа реченица:\n\n${o.sentence}\n\nОчекуваниот изговор (IPA од Викиречникот, збор по збор) е:\n${o.expected}\n\nПрепознавач на гласови го слушна ова (IPA, глас по глас):\n${o.heard}\n\nТе молам спореди ги двете, кажи ми кои гласови ги згрешив или испуштив и научи ме како подобро да ги изговарам: каде се јазикот и усните, дали гласот е звучен, сличен глас од македонскиот ако има, и кратка вежба. Имај предвид дека и препознавачот греши: посочи што изгледа како негова грешка, а не моја.`,
  ar: (o) => `أتعلّم ${o.language}. حاولت أن أقول هذه الجملة:\n\n${o.sentence}\n\nالنطق المتوقع (IPA من ويكاموس، كلمة كلمة) هو:\n${o.expected}\n\nوسمعني مُعرِّف أصوات أقول (IPA، صوتًا صوتًا):\n${o.heard}\n\nمن فضلك قارن بينهما، وأخبرني بالأصوات التي أخطأت فيها أو أسقطتها، وعلّمني كيف أنطقها أفضل: أين يكون اللسان والشفتان، وهل الصوت مجهور، وصوتًا مشابهًا من العربية إن وُجد، وتمرينًا قصيرًا. وتذكّر أن المُعرِّف يخطئ أيضًا، فنبّهني إلى ما يبدو خطأه لا خطئي.`,
};

/** a prompt to paste into an AI assistant, in the interface language */
export function aiPrompt({ language, sentence, expected, heard, ui = 'en' }) {
  return (PROMPTS[ui] ?? PROMPTS.en)({ language, sentence, expected, heard });
}

/** the trainer's address with a sentence filled in */
export function speakHref(path, text) {
  return `${path}?text=${encodeURIComponent(text)}`;
}

/** a bold bit of a lesson worth a trainer link: a phrase or sentence, not a lone word, an ending or a formula */
export function speakable(text) {
  const s = (text ?? '').trim();
  if (!/^\p{L}/u.test(s) || /[=+→←/]/.test(s) || s.length > 240) return false;
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(s)) return s.length >= 4;
  return /\p{L}[\p{M}]*['’]?\s+\p{L}/u.test(s) || /\p{L}[.!?;]$/u.test(s) && s.length > 3;
}

/** Svelte action: after each bold phrase of rendered lesson prose, a 🗣 link to the trainer (new tab) */
export function speakLinks(node, opts) {
  function apply({ speak } = {}) {
    node.querySelectorAll('a.to-speak').forEach((a) => a.remove());
    if (!speak) return;
    for (const b of node.querySelectorAll('strong, b, .say')) {
      const text = b.textContent ?? '';
      if (!speakable(text) || b.closest('th')) continue;
      const a = document.createElement('a');
      a.className = 'to-speak'; a.href = speak(text.trim()); a.target = '_blank'; a.rel = 'noopener'; a.textContent = '🗣';
      a.title = opts?.title ?? '';
      if (b.classList?.contains('say')) b.append(' ', a); else b.after(a);
    }
  }
  queueMicrotask(() => apply(opts));
  return { update(next) { opts = next; queueMicrotask(() => apply(next)); } };
}

/** the first IPA transcription in a language's section of a Wiktionary page's wikitext ({{IPA|de|/…/}}); null if none */
export function ipaFromWikitext(wikitext, section, code) {
  const parts = (wikitext ?? '').split(/^==([^=].*?)==\s*$/m);
  for (let i = 1; i < parts.length; i += 2) {
    if (parts[i].trim() !== section) continue;
    const m = parts[i + 1].match(new RegExp(`\\{\\{IPA\\|${code}\\|([^|}]+)`));
    return m ? m[1].trim() : null;
  }
  return null;
}

/** a word's dictionary entries: its readings grouped by lemma, in the order the lexicon gave them */
export function entriesFor(analyses, lemmas) {
  const out = new Map();
  for (const a of analyses ?? []) {
    const id = String(a.lemma);
    if (!lemmas?.[id]) continue;
    if (!out.has(id)) out.set(id, { id, lemma: lemmas[id], readings: [] });
    out.get(id).readings.push(a);
  }
  return [...out.values()];
}
