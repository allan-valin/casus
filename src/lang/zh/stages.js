/*
 * Chinese (overnight plan 2026-10-19). Chinese does not inflect: grammar is in the function words.
 * prepStage   a preposition (coverb) before a noun gives that noun its role on the case hues — 在 place, 给/对/向 target,
 *             从/离 from, 跟/和/同 with, 把 the object brought before the verb, 被 the agent; the two are one chunk. A word
 *             that may be preposition or verb (在, 给) is the preposition when a noun and then a verb follow.
 * deStage     的 after a word makes it the possessor or modifier of what follows (我的朋友).
 * readingStage the pinyin (the row's reading) under the word, its syllables with their tones (romanParts).
 */
import { pinyinSyllables } from './pinyin.js';

const ROLE = { 在: 'loc', 给: 'tgt', 對: 'tgt', 对: 'tgt', 向: 'tgt', 从: 'src', 從: 'src', 离: 'src', 離: 'src', 跟: 'com', 和: 'com', 同: 'com', 把: 'obj', 被: 'sbj', 为: 'tgt', 為: 'tgt' };
const NOMINAL = new Set(['noun', 'pron', 'num', 'classifier']);
const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });

export function prepStage(blocks) {
  const out = blocks.slice();
  for (let i = 0; i + 1 < out.length; i += 1) {
    const p = out[i];
    const role = ROLE[p.token.surface];
    if (!role || !p.candidates.length) continue;
    const n = out[i + 1];
    if (!n.candidates.some((c) => NOMINAL.has(c.analysis.pos))) continue;
    // a coverb is a preposition when a noun and then a verb follow, whatever the dictionary files it as (把: to hold)
    const verbAfter = out.slice(i + 2).some((b) => b.candidates.some((c) => c.analysis.pos === 'verb'));
    if (!verbAfter) continue;                                                                   // 在 as the verb "be at"
    const link = { kind: 'expression', index: p.token.index, contiguous: true };
    const base = p.candidates.find((c) => c.analysis.pos === 'prep') ?? p.candidates[0];
    out[i] = { ...p, candidates: [withReason({ ...base, analysis: { ...base.analysis, pos: 'prep', governs: [role] }, links: [...(base.links ?? []), link] }, `marks ${n.token.surface} as ${role}`)] };
    out[i + 1] = { ...n, candidates: n.candidates.filter((c) => NOMINAL.has(c.analysis.pos)).map((c) => withReason({ ...c, analysis: { ...c.analysis, case: role }, links: [...(c.links ?? []), link] }, `${p.token.surface}: ${role}`)) };
  }
  return out;
}

export function deStage(blocks) {
  const out = blocks.slice();
  for (let i = 1; i < out.length; i += 1) {
    if (out[i].token.surface !== '的' || out[i - 1].token.end !== out[i].token.start) continue;
    const w = out[i - 1];
    const link = { kind: 'expression', index: w.token.index, contiguous: true };
    out[i] = { ...out[i], candidates: out[i].candidates.filter((c) => c.analysis.pos === 'particle').map((c) => withReason({ ...c, analysis: { ...c.analysis, governs: ['gen'] }, links: [...(c.links ?? []), link] }, `makes ${w.token.surface} a possessor or modifier`)) };
    if (w.candidates.some((c) => NOMINAL.has(c.analysis.pos))) {
      out[i - 1] = { ...w, candidates: w.candidates.filter((c) => NOMINAL.has(c.analysis.pos)).map((c) => withReason({ ...c, analysis: { ...c.analysis, case: 'gen' }, links: [...(c.links ?? []), link] }, '的 after it: possessor')) };
    }
  }
  return out;
}

// the grammatical particles read in the neutral tone (的 de, not dì; 了 le, not liǎo)
const PARTICLE_READING = { 的: 'de', 了: 'le', 着: 'zhe', 著: 'zhe', 过: 'guo', 過: 'guo', 得: 'de', 地: 'de', 吗: 'ma', 嗎: 'ma', 呢: 'ne', 吧: 'ba', 啊: 'a' };

export function readingStage(blocks) {
  return blocks.map((b) => {
    const fixed = PARTICLE_READING[b.token.surface];
    if (fixed && (b.candidates.some((c) => c.analysis.pos === 'particle') || b.token.surface === '了' || b.token.surface === '的')) {
      return { ...b, roman: fixed, romanParts: [[fixed, 0]] };
    }
    const reading = b.candidates[0]?.analysis.reading;
    if (!reading) return b;
    const readings = [...new Set(b.candidates.map((c) => c.analysis.reading).filter(Boolean))];
    const roman = readings.join(' / ');
    return { ...b, roman, romanParts: readings.length === 1 ? pinyinSyllables(reading) : null };
  });
}
