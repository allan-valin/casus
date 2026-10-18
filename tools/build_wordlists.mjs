#!/usr/bin/env node
/*
 * Finishes the drills' word lists (Allan, 2026-10-18) with the app's own dictionary lookup:
 *   node tools/build_wordlists.mjs la|grc|de
 * reads vendor/wordlists/<code>/phrases.raw.json and frequency.raw.json (tools/build_wordlists.py) and writes
 *   phrases.json   [{ p, kind, en, lit: [[word, meaning]…] }]  — lit is the word-by-word reading, so a saying
 *                  whose words mean something else shows it
 *   frequency.json [{ w, en, pos, rank }]  — German forms are counted under their dictionary word
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// senses that describe grammar rather than meaning (forms the perfect…, gerund of…): skipped when a real one follows
const NOTE = /^(forms |used |gerund of|present participle of|past participle of|plural of|alternative |superseded |obsolete |clipping of|inflection of|as an? |refers to |describes )|:$|\b(singular|plural)\b.*\b(article|of)\b/i;
// the few words whose dictionary senses only describe their grammar
// the commonest words whose dictionary senses describe grammar or put a rare sense first; per language, since
// spellings collide (Latin die is 'day', not 'the')
export const PLAIN = {
  de: { der: 'the', die: 'the', das: 'the; that', ein: 'a, an', eine: 'a, an', einer: 'one', kein: 'no, not a', was: 'what', es: 'it',
    ich: 'I', du: 'you', 'sein:verb': 'to be', 'sein:det': 'his, its', 'werden:verb': 'to become; will', können: 'can, to be able',
    ja: 'yes', noch: 'still, yet', nur: 'only', man: 'one, people, you', wo: 'where', alles: 'everything', sich: 'oneself; himself, herself',
    da: 'there; since', so: 'so, like this', als: 'than; as; when', um: 'around; at (a time)', doch: 'but; yes (contradicting)',
    mal: 'just; times', in: 'in, into', auf: 'on, onto', dein: 'your', 'meinen:verb': 'to mean, to think', zu: 'to; too', an: 'at, on, to',
    wie: 'how; like', gut: 'good, well', ihr: 'you (plural); her' },
};
export const isFormOf = (g) => /^(inflection|alternative form|obsolete spelling|clipping|plural|feminine|masculine) of\b|^(nominative|genitive|dative|accusative)\b.*\bof\b/i.test(String(g ?? ''));
export function shortGloss(text, headword = null, pos = null, table = {}) {
  const plain = headword && (table[`${headword}:${pos}`] ?? table[headword]);
  if (plain) return plain;
  const senses = String(text ?? '').split(';').map((x) => x.trim()).filter(Boolean);
  let first = senses.find((x) => !NOTE.test(x)) ?? senses[0] ?? '';
  while (/\([^()]*\)/.test(first)) first = first.replace(/\([^()]*\)/g, '');
  first = first.replace(/\s+/g, ' ').trim();
  return first.length > 40 ? `${first.slice(0, 38).trim()}…` : first;
}

/** [[word, meaning]] for the words of a phrase; '' where the dictionary has nothing */
export function literalOf(tokens, lookups, glosses, lemmas = {}, frequent = new Set(), plain = {}) {
  return tokens.filter((t) => t.kind === 'word').map((t) => {
    const keys = [t.key, t.altKey, ...(t.fallbackKeys ?? [])].filter(Boolean);
    const all = keys.flatMap((k) => lookups.get(k) ?? []).filter((x) => glosses[x.lemma]);
    const real = all.filter((x) => !isFormOf(glosses[x.lemma]));
    const a = real.find((x) => frequent.has(lemmas[x.lemma]?.headword)) ?? all.find((x) => frequent.has(lemmas[x.lemma]?.headword)) ?? real[0] ?? all[0];
    return [t.surface, a ? shortGloss(glosses[a.lemma], lemmas[a.lemma]?.headword, lemmas[a.lemma]?.pos, plain) : ''];
  });
}

/** word forms with counts -> the top dictionary words; a form's own headword wins over other lemmas */
export function rankLemmas(rows, lookups, lemmas, glosses, top = 1000, plain = {}) {
  // first pass: forms that can only be one word, so an ambiguous form can go to the word common elsewhere
  const sure = new Map();
  for (const { form, n } of rows) {
    const ids = [...new Set((lookups.get(form) ?? []).filter((a) => lemmas[a.lemma] && glosses[a.lemma]).map((a) => a.lemma))];
    if (ids.length === 1) sure.set(ids[0], (sure.get(ids[0]) ?? 0) + n);
  }
  const count = new Map();
  for (const { form, n } of rows) {
    if (form.length < 2) continue;
    const cap = form[0].toUpperCase() + form.slice(1);
    const known = (xs) => (xs ?? []).filter((a) => lemmas[a.lemma] && glosses[a.lemma]);
    // the subtitles are lower-cased: a capitalised noun only when the lowercase form is no word (habe: haben)
    const all = known(lookups.get(form)).length ? known(lookups.get(form)) : known(lookups.get(cap));
    if (!all.length) continue;
    // the form's own headword, same case first (ich: the pronoun, not das Ich), then any case, then a real
    // meaning over a form-of entry (die: inflection of der)
    const real = all.filter((a) => !isFormOf(glosses[a.lemma]));
    const pool = real.length ? real : all;
    // a frequent form that is several words is usually the function word (aber: but; zu: to; auf: on)
    const ORDER = ['det', 'pron', 'conj', 'prep', 'verb', 'adj', 'adv', 'noun', 'num', 'particle', 'interj'];
    const best = (xs) => [...xs].sort((a, b) => (ORDER.indexOf(a.pos) + 99) % 110 - (ORDER.indexOf(b.pos) + 99) % 110)[0];
    // a function word wins even over a rare verb spelled like the form (einen: ein, not einen 'to unite')
    const FUNCTION = ['det', 'pron', 'conj', 'prep'];
    const fn = best(pool.filter((a) => FUNCTION.includes(a.pos)));
    const common = [...pool].sort((x, y) => (sure.get(y.lemma) ?? 0) - (sure.get(x.lemma) ?? 0))[0];
    const UNINFLECTED = ['conj', 'prep', 'particle', 'adv', 'interj'];      // aber: the conjunction before the adverb
    const plainWord = pool.filter((a) => lemmas[a.lemma].headword === form && UNINFLECTED.includes(a.pos)).sort((x, y) => UNINFLECTED.indexOf(x.pos) - UNINFLECTED.indexOf(y.pos))[0];
    const own = plainWord ?? (sure.get(common.lemma) ? common : null) ?? fn ?? best(pool.filter((a) => lemmas[a.lemma].headword === form)) ?? best(pool.filter((a) => lemmas[a.lemma].headword.toLowerCase() === form.toLowerCase())) ?? pool[0];
    if (!real.length) continue;                                     // only form-of entries (meinem): its lemma counts elsewhere
    count.set(own.lemma, (count.get(own.lemma) ?? 0) + n);
  }
  // lemmas printed the same (der the article, der the pronoun) are one row for the learner
  const rows2 = new Map();
  for (const [id, n] of count) {
    const w = lemmas[id].dict_form ?? lemmas[id].headword;
    const key = `${w}|${['det', 'pron'].includes(lemmas[id].pos) ? 'fn' : ['adj', 'adv'].includes(lemmas[id].pos) ? 'mod' : lemmas[id].pos}`;   // gut adj + gut adv too   // der article + der pronoun: one row
    const r = rows2.get(key);
    if (!r) rows2.set(key, { id, n, w }); else r.n += n;
  }
  return [...rows2].sort((a, b) => b[1].n - a[1].n).slice(0, top)
    .map(([, { id, w }], i) => ({ w, en: shortGloss(glosses[id], lemmas[id].headword, lemmas[id].pos, plain), pos: lemmas[id].pos, rank: i + 1 }));
}

async function main(code) {
  const { getLanguage } = await import('../src/lang/registry.js');
  const { createLexicon } = await import('../src/lib/lexicon.js');
  const lang = getLanguage(code);
  const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'data', code);
  const json = async (f) => JSON.parse(await readFile(path.join(dir, f), 'utf8'));
  const lexicon = createLexicon({ manifest: await json('manifest.json'), codes: lang.inventory.codes, script: lang.script, fetchShard: (n) => json(`forms/${n}.json`) });
  const glosses = await json('glosses.en.json');
  const lemmas = await json('lemmas.json');
  const rawDir = path.resolve(dir, '..', '..', 'vendor', 'wordlists', code);
  const rawJson = async (f) => JSON.parse(await readFile(path.join(rawDir, f), 'utf8'));
  const phrases = await rawJson('phrases.raw.json');
  // the frequent words' headwords: the first word of each core-list entry, or the German forms
  const raw = await rawJson('frequency.raw.json');
  const frequent = new Set(raw.flatMap((r) => (r.form ? [r.form, r.form[0].toUpperCase() + r.form.slice(1)] : [r.w.split(/[ ,]/)[0]])));
  const out = [];
  for (const p of phrases) {
    const tokens = lang.tokenize(p.p);
    const keys = tokens.filter((t) => t.kind === 'word').flatMap((t) => [t.key, t.altKey, ...(t.fallbackKeys ?? [])].filter(Boolean));
    out.push({ ...p, lit: literalOf(tokens, await lexicon.lookupAll(keys), glosses, lemmas, frequent, PLAIN[code] ?? {}) });
  }
  await writeFile(path.join(dir, 'phrases.json'), JSON.stringify(out));
  let freq = raw;
  if (freq[0]?.form) {
    const forms = freq.flatMap((r) => [r.form, r.form[0].toUpperCase() + r.form.slice(1)]);
    freq = rankLemmas(freq, await lexicon.lookupAll(forms), lemmas, glosses, 1000, PLAIN[code] ?? {});
  }
  await writeFile(path.join(dir, 'frequency.json'), JSON.stringify(freq));
  console.log(`${code}: ${out.length} phrases (${out.filter((p) => p.lit.every(([, g]) => g)).length} with every word glossed), ${freq.length} frequent words`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv[2]);
