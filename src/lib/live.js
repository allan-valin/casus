/*
 * Wiktionary on demand (Allan, 2026-10-19): a word the prebuilt dictionary does not know is looked up live in the
 * English Wiktionary's definition API, which browsers may call. A form's page reads like "dative/locative singular of
 * Praha", which gives the lemma and the readings; a lemma's page gives its meaning, read as the citation form. Answers
 * (misses too) are kept, so a word is asked once. Only forms that have their own page can be found this way.
 */
const API = 'https://en.wiktionary.org/api/rest_v1/page/definition/';
const POS = { Noun: 'noun', 'Proper noun': 'noun', Verb: 'verb', Adjective: 'adj', Adverb: 'adv', Pronoun: 'pron', Preposition: 'prep',
  Postposition: 'prep', Conjunction: 'conj', Particle: 'particle', Numeral: 'num', Determiner: 'det', Article: 'det', Interjection: 'interj', Participle: 'verb' };
const CASES = { nominative: 'nom', genitive: 'gen', dative: 'dat', accusative: 'acc', vocative: 'voc', locative: 'loc', instrumental: 'ins',
  ablative: 'abl', prepositional: 'loc', partitive: 'par', essive: 'ess', translative: 'tra', inessive: 'ine', elative: 'ela', illative: 'ill',
  adessive: 'ade', allative: 'all', abessive: 'abe', comitative: 'com', instructive: 'ins', sublative: 'sub', superessive: 'sup', delative: 'del',
  terminative: 'ter', 'causal-final': 'cau' };
const NUMBERS = { singular: 'sg', plural: 'pl', dual: 'du' };
const GENDERS = { masculine: 'm', feminine: 'f', neuter: 'n' };
const PERSONS = { 'first-person': '1', 'second-person': '2', 'third-person': '3' };
const TENSES = { present: 'pres', past: 'past', preterite: 'past', imperfect: 'impf', future: 'fut', aorist: 'aor', perfect: 'perf', pluperfect: 'plup' };
const MOODS = { indicative: 'ind', subjunctive: 'subj', imperative: 'imp', conditional: 'cond', optative: 'opt', infinitive: 'inf' };

const text = (html) => String(html ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** every combination of the slash-joined grammatical words before "of" (dative/locative singular → dat sg, loc sg) */
function readingsOf(words, pos, caseIds) {
  const groups = words.split(/\s+/).map((w) => w.split('/'));
  let combos = [{}];
  for (const alts of groups) {
    const next = [];
    for (const c of combos) {
      for (const w of alts) {
        const lw = w.toLowerCase();
        const set = (k, v) => next.push({ ...c, [k]: v });
        if (CASES[lw] && caseIds.includes(CASES[lw])) set('case', CASES[lw]);
        else if (NUMBERS[lw]) set('number', NUMBERS[lw]);
        else if (GENDERS[lw]) set('gender', GENDERS[lw]);
        else if (PERSONS[lw]) set('person', PERSONS[lw]);
        else if (TENSES[lw]) set('tense', TENSES[lw]);
        else if (MOODS[lw]) set('mood', MOODS[lw]);
        else if (lw === 'passive' || lw === 'mediopassive') set('voice', 'pass');
        else if (lw === 'negative') set('polarity', 'neg');
        else next.push(c);
      }
    }
    combos = next;
  }
  return combos.map((c) => ({ pos, ...c, ...(pos === 'verb' && c.person && !c.mood ? { mood: 'ind' } : {}), ...(pos === 'verb' && c.person && !c.tense ? { tense: 'pres' } : {}) }));
}

const FORM_OF = /^(?:inflection of )?(.*?)\bof ([^\s:;,()]+)(?::\s*(.*))?$/i;

export function parseDefinitions(json, code, caseIds, title = '') {
  const out = { analyses: [], lemmas: {}, glosses: {}, alternativeOf: null };
  for (const item of json?.[code] ?? []) {
    const pos = POS[item.partOfSpeech];
    if (!pos) continue;
    const defs = (item.definitions ?? []).map((d) => text(d.definition)).filter(Boolean);
    const plain = [];
    for (const d of defs) {
      const alt = d.match(/^(?:alternative|obsolete|archaic|dated|nonstandard) (?:form|spelling) of ([^\s:;,()]+)/i);
      if (alt) { out.alternativeOf ??= alt[1]; continue; }
      const m = d.match(FORM_OF);
      const grammar = m && (m[3] ?? m[1]);
      if (m && grammar && /(singular|plural|dual|person|nominative|genitive|dative|accusative|locative|instrumental|vocative|past|present|future|participle|infinitive|imperative)/i.test(grammar)) {
        const id = `w:${code}:${m[2]}`;
        out.lemmas[id] ??= { headword: m[2], pos, live: true };
        for (const r of readingsOf(grammar.replace(/\bof\b.*$/, ''), pos, caseIds)) out.analyses.push({ ...r, lemma: id });
      } else plain.push(d);
    }
    if (plain.length) {
      const headword = title;
      const id = `w:${code}:${headword}`;
      out.lemmas[id] ??= { headword, pos, live: true };
      out.glosses[id] = [out.glosses[id], ...plain].filter(Boolean).join('; ');
      const citation = ['noun', 'adj', 'pron', 'det', 'num'].includes(pos) ? { case: 'nom', number: 'sg' } : pos === 'verb' ? { mood: 'inf' } : {};
      out.analyses.push({ pos, ...citation, lemma: id });
    }
  }
  return out;
}

export function createLive({ fetchImpl, code, caseIds, storage, max = 40, timeoutMs = 5000 }) {
  const mem = new Map();
  const key = (w) => `casus.live.${code}.${w}`;
  async function ask(title) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    try {
      const r = await fetchImpl(API + encodeURIComponent(title), { headers: { 'Api-User-Agent': 'Casus (https://allan-valin.github.io/casus/)' }, signal: ctl?.signal });
      if (!r.ok) return null;
      const json = await r.json();
      return json;
    } catch { return null; } finally { if (timer) clearTimeout(timer); }
  }
  async function one(word) {
    if (mem.has(word)) return mem.get(word);
    const kept = storage?.get(key(word));
    if (kept) { mem.set(word, kept); return kept; }
    let result = { analyses: [], lemmas: {}, glosses: {}, alternativeOf: null };
    for (const title of [...new Set([word, word.charAt(0).toUpperCase() + word.slice(1)])]) {
      const json = await ask(title);
      if (!json) continue;
      const parsed = parseDefinitions(json, code, caseIds, title);
      if (parsed.analyses.length || parsed.alternativeOf) { result = parsed; break; }
    }
    mem.set(word, result);
    try { storage?.set(key(word), result); } catch { /* storage full or blocked: memory only */ }
    return result;
  }
  return {
    /** surfaces → Map(surface → { analyses, lemmas, glosses, alternativeOf }) */
    async lookup(words) {
      const unique = [...new Set(words)].slice(0, max);
      const out = new Map();
      for (const w of unique) out.set(w, await one(w));
      return out;
    },
  };
}
