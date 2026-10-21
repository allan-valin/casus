/*
 * Macedonian spelling → sounds, for the Piper voice that speaks Macedonian (Allan, 2026-10-21: the Bulgarian Piper
 * voice reading Macedonian sounds — human-like, unlike espeak). Macedonian spelling is close to one letter, one
 * sound; on top: stress on the third syllable from the end (the first of shorter words), unstressed clitics, and
 * final devoicing unless a voiced consonant follows. Same symbols as the approved samples
 * (spikes/mk-voice-2026-10-21): plain vowels, ќ kʲ, ѓ ɡʲ.
 */
const LETTER = {
  а: 'a', б: 'b', в: 'v', г: 'ɡ', д: 'd', ѓ: 'ɡʲ', е: 'e', ж: 'ʒ', з: 'z', ѕ: 'dz', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'ʎ',
  м: 'm', н: 'n', њ: 'ɲ', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ќ: 'kʲ', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'tʃ', џ: 'dʒ', ш: 'ʃ',
  ѐ: 'e', ѝ: 'i',
};
const DEVOICE = { b: 'p', d: 't', ɡ: 'k', z: 's', ʒ: 'ʃ', v: 'f', 'ɡʲ': 'kʲ', dz: 'ts', dʒ: 'tʃ' };
const VOICED_START = /^[бгдѓжзѕџ]/;
const VOWEL = /[аеиоуѐѝ]/;
// unstressed little words (prepositions, short pronouns, ли, сум…): they lean on the next or the previous word
export const CLITICS = new Set(['ли', 'е', 'во', 'до', 'се', 'ќе', 'ги', 'го', 'ја', 'ми', 'ти', 'му', 'ѝ', 'на', 'од', 'со', 'за', 'и', 'а',
  'сум', 'си', 'сме', 'сте', 'ме', 'те', 'не', 'да', 'ги', 'ни', 'ви', 'им', 'ке', 'по', 'без', 'кон', 'низ', 'при', 'пред', 'зад', 'меѓу', 'преку']);

function word(w, next, alone) {
  const lower = w.toLowerCase();
  const sounds = [...lower].map((c) => LETTER[c] ?? c);
  // final devoicing, unless the next word begins with a voiced consonant (од Бразил)
  const last = sounds.length - 1;
  if (DEVOICE[sounds[last]] && !(next && VOICED_START.test(next.toLowerCase()))) sounds[last] = DEVOICE[sounds[last]];
  const vowels = [...lower].map((c, i) => (VOWEL.test(c) ? i : -1)).filter((i) => i >= 0);
  if (!vowels.length || (CLITICS.has(lower) && !alone)) return sounds.join('');
  const stressed = vowels[Math.max(0, vowels.length - 3)];
  return sounds.map((s, i) => (i === stressed ? `ˈ${s}` : s)).join('');
}

/** IPA for Macedonian text: words apart by spaces, punctuation kept */
export function mkPhonemes(text) {
  const parts = text.normalize('NFC').match(/[\p{L}\p{M}]+|[.,!?;:…—–-]/gu) ?? [];
  const words = parts.filter((p) => /\p{L}/u.test(p));
  let out = '';
  let k = 0;
  for (const [j, p] of parts.entries()) {
    if (/\p{L}/u.test(p)) {
      // a clitic between two pauses stands on its own and is stressed (Да, … — yes)
      const pause = (x) => x === undefined || /^[.,!?;:…]$/.test(x);
      const w = word(p, words[k + 1], words.length === 1 || (pause(parts[j - 1]) && pause(parts[j + 1])));
      out += (out && !out.endsWith(' ') ? ' ' : '') + w;
      k += 1;
    } else out += p;
  }
  return out.replace(/ ([.,!?;:…])/g, '$1');
}

/** Piper phoneme ids from IPA (each symbol, then the pad), framed by ^ and $ */
export function phonemeIds(text, map, { ipa = false } = {}) {
  const s = ipa ? text : mkPhonemes(text);
  const ids = [map['^'][0], map._[0]];
  for (const ch of s) if (map[ch]) ids.push(map[ch][0], map._[0]);
  ids.push(map.$[0]);
  return ids;
}
