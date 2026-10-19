/* Sanskrit external sandhi undone at the word end, the common cases only (docs/languages/sa.md): the dictionary
 * writes each word in its pausa form, the text writes it changed by the next word.
 * - -o before a voiced sound was -aḥ (रामो गच्छति), -r was -iḥ/-uḥ (हरिर्), a dropped visarga after -a (राम आगच्छति)
 * - a voiced final stop was voiceless (वाग्, तद्)
 * - the avagraha (ऽ) marks an initial a- swallowed by -o/-e: रामोऽपि = रामः + अपि
 * - an unknown word written together with the next splits in two known words (हरिर्जयति = हरिः + जयति) */
import { cleanSa } from './script.js';

const VIRAMA = '्';
const VOICED = { ग: 'क', ज: 'च', ड: 'ट', द: 'त', ब: 'प' };

export function undoSandhi(word) {
  const out = [];
  if (word.endsWith('ो')) out.push(`${word.slice(0, -1)}ः`);
  if (word.endsWith(`र${VIRAMA}`)) out.push(`${word.slice(0, -2)}ः`);
  // visarga before c/ch is ś, before ṭ ṣ, before t s (पाण्डवाश्च, ततस्तत्र)
  if (/[शषस]\u094d$/u.test(word)) out.push(`${word.slice(0, -2)}ः`);
  const stop = word.at(-2);
  if (word.endsWith(VIRAMA) && VOICED[stop]) out.push(`${word.slice(0, -2)}${VOICED[stop]}${VIRAMA}`);
  if (/[क-ह]$/u.test(word) || /[ािीुू]$/u.test(word)) out.push(`${word}ः`);
  return out;
}

// cuts fall before a letter that starts a syllable (a consonant or an independent vowel), never inside one
const cuts = (w) => [...w].map((_, i) => i).filter((i) => i > 1 && i < [...w].length && /[\u0904-\u0939]/u.test([...w][i]));

// a final consonant joined to the next word's vowel (सत्यमेव = सत्यम् + एव): the consonant with a virama, then the
// vowel sign written as its letter (no sign: अ)
const INDEPENDENT = { 'ा': 'आ', 'ि': 'इ', 'ी': 'ई', 'ु': 'उ', 'ू': 'ऊ', 'ृ': 'ऋ', 'े': 'ए', 'ै': 'ऐ', 'ो': 'ओ', 'ौ': 'औ' };
function joins(w) {
  const cs = [...w];
  const out = [];
  for (let i = 1; i < cs.length - 1; i += 1) {
    if (!/[\u0915-\u0939]/u.test(cs[i]) || cs[i + 1] === VIRAMA) continue;
    const sign = INDEPENDENT[cs[i + 1]];
    const right = sign ? sign + cs.slice(i + 2).join('') : `अ${cs.slice(i + 1).join('')}`;
    if ([...right].length < 2) continue;
    out.push({ at: i + 1, left: `${cs.slice(0, i + 1).join('')}${VIRAMA}`, right });
  }
  return out;
}

// vowel sandhi across words: a/ā + a/ā → ā, + i/ī → e, + u/ū → o, + e → ai, + o → au (गङ्गोदकम् = गङ्गा + उदकम्);
// i/ī + a vowel → y, u/ū + a vowel → v (इत्यादि = इति + आदि). Each cut: the left word's possible ends, the right's starts.
const MERGED = { 'ा': ['अ', 'आ'], 'े': ['इ', 'ई'], 'ो': ['उ', 'ऊ'], 'ै': ['ए', 'ऐ'], 'ौ': ['ओ', 'औ'] };
function vowelJoins(w) {
  const cs = [...w];
  const out = [];
  for (let i = 1; i < cs.length - 1; i += 1) {
    if (MERGED[cs[i]] && /[\u0915-\u0939]/u.test(cs[i - 1])) {     // a one-letter word too (च + एव = चैव)
      const stem = cs.slice(0, i).join('');
      const rest = cs.slice(i + 1).join('');
      out.push({ at: i + 1, lefts: [stem, `${stem}ा`, `${stem}ः`], rights: MERGED[cs[i]].map((v) => v + rest) });
    }
    if ((cs[i] === 'य' || cs[i] === 'व') && cs[i - 1] === VIRAMA && i >= 3) {
      const stem = cs.slice(0, i - 1).join('');
      const sign = INDEPENDENT[cs[i + 1]];
      const rest = cs.slice(sign ? i + 2 : i + 1).join('');
      const ends = cs[i] === 'य' ? ['ि', 'ी'] : ['ु', 'ू'];
      out.push({ at: sign ? i + 2 : i + 1, lefts: ends.map((e) => stem + e), rights: [(sign ?? 'अ') + rest] });
    }
  }
  return out;
}

/** every key a word could need: itself, its sandhi-undone forms, both halves of every cut */
function keysOf(key) {
  const keys = new Set([key, ...undoSandhi(key)]);
  const [head, tail] = key.split('ऽ');
  if (tail !== undefined) { keys.add(head); for (const v of undoSandhi(head)) keys.add(v); keys.add(`अ${tail}`); }
  const cs = [...key];
  for (const j of joins(key)) { keys.add(j.left); keys.add(j.right); }
  for (const j of vowelJoins(key)) { for (const l of j.lefts) { keys.add(l); for (const v of undoSandhi(l)) keys.add(v); } for (const r of j.rights) keys.add(r); }
  for (const i of cuts(key)) { const left = cs.slice(0, i).join(''); keys.add(left); for (const v of undoSandhi(left)) keys.add(v); keys.add(cs.slice(i).join('')); }
  return keys;
}

export async function splitWords(tokens, lexicon) {
  const found = new Map();
  const ensure = async (keys) => { const missing = [...keys].filter((k) => !found.has(k)); if (missing.length) for (const [k, v] of await lexicon.lookupAll(missing)) found.set(k, v); };
  const known = (k) => (found.get(k) ?? []).length > 0;
  const rekey = (k0) => { const k = cleanSa(k0); return known(k) ? k : undoSandhi(k).find(known) ?? k; };

  /** a written word as dictionary words, [{surface, key}]; the rest after a cut may split again (three words at most) */
  async function pieces(surface, key, depth = 0) {
    await ensure(new Set([...keysOf(key), ...[...keysOf(surface)].map(cleanSa)]));
    const whole = rekey(key);
    if (known(whole)) return [{ surface, key: whole }];
    const cs = [...surface];
    const at = surface.indexOf('ऽ');
    const options = [];
    if (at > 0) options.push({ head: surface.slice(0, at), headKey: rekey(surface.slice(0, at)), rest: surface.slice(at), restKey: `अ${surface.slice(at + 1)}` });
    for (const i of cuts(surface)) options.push({ head: cs.slice(0, i).join(''), headKey: rekey(cs.slice(0, i).join('')), rest: cs.slice(i).join(''), restKey: cs.slice(i).join('') });
    // the shared syllable is shown with the first word (सत्यमे + व reads oddly; सत्य + मेव too): cut after it
    for (const j of joins(surface)) { const n = j.at + (INDEPENDENT[cs[j.at]] ? 1 : 0); options.push({ head: cs.slice(0, n).join(''), headKey: j.left, rest: cs.slice(n).join(''), restKey: j.right }); }
    for (const v of vowelJoins(surface)) {
      const left = v.lefts.map(rekey).find(known);
      if (left) for (const r of v.rights) options.push({ head: cs.slice(0, v.at).join(''), headKey: left, rest: cs.slice(v.at).join(''), restKey: r });
    }
    for (const o of options) { o.headKey = cleanSa(o.headKey); o.restKey = cleanSa(o.restKey); }
    await ensure(new Set(options.flatMap((o) => [o.headKey, o.restKey, ...undoSandhi(o.headKey)])));
    for (const o of options) o.headKey = rekey(o.headKey);
    for (const o of options) if (known(o.headKey) && known(o.restKey)) return [{ surface: o.head, key: o.headKey }, { surface: o.rest, key: o.restKey }];
    if (depth < 3) {                                 // up to four words (कर्मण्येवाधिकारस्ते)
      for (const o of options) {
        if (!known(o.headKey) || !o.rest) continue;
        const more = await pieces(o.rest, o.restKey, depth + 1);
        if (more.length > 1 || known(more[0].key)) return [{ surface: o.head, key: o.headKey }, ...more];
      }
    }
    return [{ surface, key }];
  }

  const out = [];
  for (const t of tokens) {
    if (t.kind !== 'word') { out.push(t); continue; }
    const ps = await pieces(t.surface, t.key);
    if (ps.length === 1) { out.push(ps[0].key === t.key ? t : { ...t, key: ps[0].key }); continue; }
    let at = t.start;
    for (const p of ps) { out.push({ ...t, surface: p.surface, key: p.key, start: at, end: at + p.surface.length }); at += p.surface.length; }
  }
  return out;
}
