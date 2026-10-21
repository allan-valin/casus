/* Narration split into the narrator's voice and the taught voice (Allan, 2026-10-21: Macedonian words inside the
 * narration must sound Macedonian). «…» marks taught words in any alphabet. Words in the taught language's own
 * alphabet are found by themselves, quoted or not — but only that alphabet: a German course narrated in Arabic or
 * Macedonian keeps its narration in the narrator's voice. */
const SCRIPTS = [
  ['Cyrillic', '\\p{Script=Cyrillic}'], ['Greek', '\\p{Script=Greek}'], ['Arabic', '\\p{Script=Arabic}'],
  ['Hebrew', '\\p{Script=Hebrew}'], ['Hangul', '\\p{Script=Hangul}'], ['Devanagari', '\\p{Script=Devanagari}'],
  ['Bengali', '\\p{Script=Bengali}'], ['Japanese', '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}ー'],
];

const BY_CODE = { mk: 'Cyrillic', bg: 'Cyrillic', ru: 'Cyrillic', uk: 'Cyrillic', sr: 'Cyrillic', el: 'Greek', grc: 'Greek',
  ar: 'Arabic', fa: 'Arabic', he: 'Hebrew', ko: 'Hangul', ja: 'Japanese', zh: 'Japanese', hi: 'Devanagari', bn: 'Bengali' };

/** the letter class of the taught language's alphabet — from its code, else from a sample; null for Latin script */
export function taughtLetters(code, sample = '') {
  const named = BY_CODE[code];
  if (named) return SCRIPTS.find(([n]) => n === named)[1];
  for (const [, cls] of SCRIPTS) if (new RegExp(`[${cls}]`, 'u').test(sample ?? '')) return cls;
  return null;
}

// a quote opens only where no letter precedes it and closes where none follows, so the apostrophe of "don't" is not
// a quote (Allan, 2026-10-22: English read the Macedonian of A1-01)
const QUOTED = /«([^»]+)»|(?<!\p{L})['‘"“]([^'‘’"“”]+?)['’"”](?!\p{L})/gu;

export function narrationParts(text, letters = null) {
  text = String(text);
  const own = letters ? new RegExp(`[${letters}]`, 'u') : null;
  const runs = letters ? new RegExp(`[${letters}\\p{M}]+(?:[\\s\\-–—]+[${letters}\\p{M}]+)*`, 'gu') : null;
  const split = (seg) => {
    if (!runs) return [{ text: seg, taught: false }];
    const out = [];
    let at = 0;
    for (const m of seg.matchAll(runs)) {
      if (m.index > at) out.push({ text: seg.slice(at, m.index), taught: false });
      out.push({ text: m[0], taught: true });
      at = m.index + m[0].length;
    }
    if (at < seg.length) out.push({ text: seg.slice(at), taught: false });
    return out;
  };
  const out = [];
  let at = 0;
  for (const m of text.matchAll(QUOTED)) {
    const inner = m[1] ?? m[2];
    if (m[1] == null && !(own && own.test(inner))) continue;
    if (m.index > at) out.push(...split(text.slice(at, m.index)));
    out.push({ text: inner, taught: true });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push(...split(text.slice(at)));
  return out.map((p) => ({ ...p, text: p.taught ? p.text.trim() : p.text.replace(/^[\s\p{P}\p{S}]+(?=\p{L})/u, '').trim() }))
    .filter((p) => /[\p{L}\p{N}]/u.test(p.text));
}
