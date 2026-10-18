/*
 * Japanese stages (overnight plan 2026-10-19). Each narrows, never empties.
 * kanaStage     a word met only as the kana spelling of a kanji word loses to a word spelled that way (は: the
 *               particle, not 歯).
 * particleStage a role particle (は が を に へ で の と から まで より) right after a word gives it its role: the
 *               word takes the role as its `case`, the particle governs it, and the two are one chunk.
 * readingStage  furigana (block.furi) over kanji, hiragana over katakana; romaji (block.roman); the particles
 *               は, へ, を read wa, e, o.
 */
import { ROLE_OF } from './inventory.js';
import { alignFurigana } from './furigana.js';
import { kanaToRomaji, toHiragana } from './romanize.js';

const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });
const NOMINAL = new Set(['noun', 'pron', 'num', 'counter', 'suffix']);
const KANJI = /[㐀-鿿豈-﫿々〆ヶ]/u;
const KATAKANA = /[ァ-ヺ]/u;
const PARTICLE_READING = { は: 'わ', へ: 'え', を: 'お' };

export function kanaStage(blocks) {
  return blocks.map((b) => {
    const direct = b.candidates.filter((c) => c.analysis.form !== 'kana');
    return direct.length && direct.length < b.candidates.length ? { ...b, candidates: direct } : b;
  });
}

export function particleStage(blocks) {
  const out = blocks.slice();
  for (let i = 1; i < out.length; i += 1) {
    const p = out[i];
    const role = ROLE_OF[p.token.surface];
    if (!role || !p.candidates.some((c) => c.analysis.pos === 'particle')) continue;
    const w = out[i - 1];
    if (p.token.index - w.token.index !== 1 || !w.candidates.some((c) => NOMINAL.has(c.analysis.pos))) continue;
    const link = { kind: 'expression', index: w.token.index, contiguous: true };
    const r = `particle ${p.token.surface} marks it: ${role}`;
    out[i - 1] = { ...w, candidates: w.candidates.filter((c) => NOMINAL.has(c.analysis.pos)).map((c) => withReason({ ...c, analysis: { ...c.analysis, case: role }, links: [...(c.links ?? []), link] }, r)) };
    out[i] = { ...p, candidates: p.candidates.filter((c) => c.analysis.pos === 'particle').map((c) => withReason({ ...c, analysis: { ...c.analysis, governs: [role] }, links: [...(c.links ?? []), link] }, `marks ${w.token.surface} as ${role}`)) };
  }
  return out;
}

/** a word that may be a noun or an adverb and has no particle after it is the adverb (毎日 every day, 今 now) */
export function adverbStage(blocks) {
  return blocks.map((b, i) => {
    const next = blocks[i + 1];
    const marked = next && next.token.index - b.token.index === 1 && ROLE_OF[next.token.surface] && next.candidates.some((c) => c.analysis.pos === 'particle');
    if (marked || !b.candidates.some((c) => c.analysis.pos === 'adv') || !b.candidates.some((c) => c.analysis.pos === 'noun')) return b;
    const keep = b.candidates.filter((c) => c.analysis.pos === 'adv');
    return { ...b, candidates: keep.map((c) => withReason(c, 'no particle after it, so the adverb')) };
  });
}

export function readingStage(blocks) {
  return blocks.map((b) => {
    const s = b.token.surface;
    const first = b.candidates[0]?.analysis;
    let reading = first?.reading ?? null;
    if (!reading && !KANJI.test(s)) reading = s;
    if (b.candidates.length && b.candidates.every((c) => c.analysis.pos === 'particle') && PARTICLE_READING[s]) {
      return { ...b, roman: kanaToRomaji(PARTICLE_READING[s]) };
    }
    const furi = KANJI.test(s) && reading ? alignFurigana(s, reading)
      : KATAKANA.test(s) ? [[s, toHiragana(s)]] : null;
    const roman = reading ? kanaToRomaji(reading, { verb: first?.pos === 'verb' && first?.form === 'dict' }) : '';
    return { ...b, ...(furi && furi.some(([, r]) => r) ? { furi } : {}), ...(roman ? { roman } : {}) };
  });
}
