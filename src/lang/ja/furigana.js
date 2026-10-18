/*
 * Furigana (Allan, 2026-10-18: like NHK Easy, the reading small over the kanji): align a word's surface with its
 * kana reading — each run of kana in the surface must appear in the reading, the kanji runs take what lies
 * between. Returns [[text, reading or null]…]; null readings where the text is kana or the reading does not fit.
 */
import { toHiragana } from './romanize.js';

const KANA = /^[぀-ヿー]+$/;

export function alignFurigana(surface, reading) {
  const runs = [];
  for (const ch of surface) {
    const kana = KANA.test(ch);
    const last = runs[runs.length - 1];
    if (last && last.kana === kana) last.text += ch; else runs.push({ text: ch, kana });
  }
  if (!reading || runs.every((r) => r.kana)) return [[surface, null]];
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${runs.map((r) => (r.kana ? `(${escape(toHiragana(r.text))})` : '(.+?)')).join('')}$`);
  const m = toHiragana(reading).match(pattern);
  if (!m) return [[surface, null]];
  return runs.map((r, i) => [r.text, r.kana ? null : m[i + 1]]);
}
