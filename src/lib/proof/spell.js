/* Spelling in the page (Allan, 2026-10-18/19: a LanguageTool-like checker without the paywall). Hunspell itself,
 * compiled to WebAssembly (hunspell-asm, MIT), with the LibreOffice dictionaries (npm dictionary-* packages on
 * jsDelivr); pt-BR's VERO loads in under a second (nspell, tried first, took minutes on it). Offline once loaded.
 * Words are runs of letters (apostrophes and hyphens inside a word kept); numbers are not checked. */

// language code → [npm package, version]; licences in NOTICE.md
export const DICTIONARIES = {
  pt: ['dictionary-pt', '4.0.0'], de: ['dictionary-de', '3.0.0'], el: ['dictionary-el', '4.0.0'], ru: ['dictionary-ru', '3.0.0'],
  pl: ['dictionary-pl', '2.0.0'], cs: ['dictionary-cs', '4.0.0'], hu: ['dictionary-hu', '3.0.0'], is: ['dictionary-is', '2.0.0'],
  tr: ['dictionary-tr', '2.0.0'], la: ['dictionary-la', '2.0.0'], mk: ['dictionary-mk', '2.0.0'], ko: ['dictionary-ko', '2.0.0'],
  // 2026-10-27 (Allan: every language that has an open dictionary gets one)
  en: ['dictionary-en', '4.0.0'], es: ['dictionary-es', '4.0.0'], fr: ['dictionary-fr', '3.0.0'], it: ['dictionary-it', '2.0.0'],
  nl: ['dictionary-nl', '2.0.0'], uk: ['dictionary-uk', '4.0.0'], ro: ['dictionary-ro', '3.0.0'], sv: ['dictionary-sv', '4.0.0'],
  fa: ['dictionary-fa', '2.0.0'], lt: ['dictionary-lt', '2.0.0'], vi: ['dictionary-vi', '3.0.0'], sh: ['dictionary-hr', '2.0.0'],
};

let hunspell = null;
/** { correct(word), suggest(word) } from the text of a .aff and a .dic */
export async function makeSpeller(aff, dic) {
  hunspell ??= import('hunspell-asm').then((m) => m.loadModule());
  const factory = await hunspell;
  const enc = new TextEncoder();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const a = factory.mountBuffer(enc.encode(aff), `${id}.aff`);
  const d = factory.mountBuffer(enc.encode(dic), `${id}.dic`);
  const h = factory.create(a, d);
  return { correct: (w) => h.spell(w), suggest: (w) => h.suggest(w) };
}

export async function loadSpeller(code, fetchImpl) {
  const d = DICTIONARIES[code];
  if (!d) return null;
  const base = `https://cdn.jsdelivr.net/npm/${d[0]}@${d[1]}`;
  const [aff, dic] = await Promise.all(['index.aff', 'index.dic'].map((f) => fetchImpl(`${base}/${f}`).then((r) => {
    if (!r.ok) throw new Error(`${d[0]}/${f}: ${r.status}`);
    return r.text();
  })));
  return makeSpeller(aff, dic);
}

const WORD = /[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu;

/** [{ kind: 'spelling', word, offset, length, replacements }] for the words the dictionary does not know */
export function spellIssues(text, speller, { suggest = false, max = 300 } = {}) {
  const out = [];
  const seen = new Map();
  for (const m of text.matchAll(WORD)) {
    const w = m[0];
    let ok = seen.get(w);
    if (ok === undefined) {
      ok = speller.correct(w) || speller.correct(w.toLowerCase()) || (w.includes('-') && w.split('-').every((p) => speller.correct(p) || speller.correct(p.toLowerCase())));
      seen.set(w, ok);
    }
    if (ok) continue;
    out.push({ kind: 'spelling', word: w, offset: m.index, length: w.length, replacements: suggest && out.length < 40 ? speller.suggest(w).slice(0, 5) : [] });
    if (out.length >= max) break;
  }
  return out;
}
