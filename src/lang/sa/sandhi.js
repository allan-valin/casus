/* Sanskrit external sandhi undone at the word end, the common cases only (docs/languages/sa.md): the dictionary
 * writes each word in its pausa form, the text writes it changed by the next word.
 * - -o before a voiced sound was -aḥ (रामो गच्छति), -r was -iḥ/-uḥ (हरिर्), a dropped visarga after -a (राम आगच्छति)
 * - a voiced final stop was voiceless (वाग्, तद्)
 * - the avagraha (ऽ) marks an initial a- swallowed by -o/-e: रामोऽपि = रामः + अपि
 * - an unknown word written together with the next splits in two known words (हरिर्जयति = हरिः + जयति) */
const VIRAMA = '्';
const VOICED = { ग: 'क', ज: 'च', ड: 'ट', द: 'त', ब: 'प' };

export function undoSandhi(word) {
  const out = [];
  if (word.endsWith('ो')) out.push(`${word.slice(0, -1)}ः`);
  if (word.endsWith(`र${VIRAMA}`)) out.push(`${word.slice(0, -2)}ः`);
  const stop = word.at(-2);
  if (word.endsWith(VIRAMA) && VOICED[stop]) out.push(`${word.slice(0, -2)}${VOICED[stop]}${VIRAMA}`);
  if (/[क-ह]$/u.test(word) || /[ािीुू]$/u.test(word)) out.push(`${word}ः`);
  return out;
}

// cuts fall before a letter that starts a syllable (a consonant or an independent vowel), never inside one
const cuts = (w) => [...w].map((_, i) => i).filter((i) => i > 1 && i < [...w].length - 1 && /[\u0904-\u0939]/u.test([...w][i]));

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

export async function splitWords(tokens, lexicon) {
  const words = tokens.filter((t) => t.kind === 'word');
  const keys = new Set();
  for (const t of words) {
    keys.add(t.key);
    const [head, tail] = t.key.split('ऽ');
    if (tail !== undefined) { keys.add(head); for (const v of undoSandhi(head)) keys.add(v); keys.add(`अ${tail}`); }
    for (const v of undoSandhi(t.key)) keys.add(v);
    const cs = [...t.key];
    for (const j of joins(t.key)) { keys.add(j.left); keys.add(j.right); }
    for (const i of cuts(t.key)) { const left = cs.slice(0, i).join(''); keys.add(left); for (const v of undoSandhi(left)) keys.add(v); keys.add(cs.slice(i).join('')); }
  }
  const found = await lexicon.lookupAll([...keys]);
  const known = (k) => (found.get(k) ?? []).length > 0;
  const rekey = (k) => (known(k) ? k : undoSandhi(k).find(known) ?? k);
  const out = [];
  for (const t of tokens) {
    if (t.kind !== 'word') { out.push(t); continue; }
    const cut = t.surface.indexOf('ऽ');
    if (cut > 0) {
      const head = t.surface.slice(0, cut);
      out.push({ ...t, surface: head, key: rekey(head), end: t.start + cut });
      out.push({ ...t, surface: t.surface.slice(cut), key: `अ${t.surface.slice(cut + 1)}`, start: t.start + cut });
      continue;
    }
    const whole = rekey(t.key);
    if (known(whole)) { out.push(whole === t.key ? t : { ...t, key: whole }); continue; }
    const cs = [...t.surface];
    const at = cuts(t.surface).find((i) => known(rekey(cs.slice(0, i).join(''))) && known(cs.slice(i).join('')));
    if (at === undefined) {
      const j = joins(t.surface).find((x) => known(x.left) && known(x.right));
      if (!j) { out.push(t); continue; }
      // the shared syllable is shown with the first word (सत्यमे + व reads oddly; सत्य + मेव too): cut after it
      const head = cs.slice(0, j.at + (INDEPENDENT[cs[j.at]] ? 1 : 0)).join('');
      out.push({ ...t, surface: head, key: j.left, end: t.start + head.length });
      out.push({ ...t, surface: t.surface.slice(head.length), key: j.right, start: t.start + head.length });
      continue;
    }
    const left = cs.slice(0, at).join('');
    out.push({ ...t, surface: left, key: rekey(left), end: t.start + left.length });
    out.push({ ...t, surface: cs.slice(at).join(''), key: cs.slice(at).join(''), start: t.start + left.length });
  }
  return out;
}
