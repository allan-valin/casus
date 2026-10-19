/* Sanskrit external sandhi undone at the word end, the common cases only (docs/languages/sa.md): the dictionary
 * writes each word in its pausa form, the text writes it changed by the next word.
 * - -o before a voiced sound was -aḥ (रामो गच्छति), -r was -iḥ/-uḥ (हरिर्), a dropped visarga after -a (राम आगच्छति)
 * - a voiced final stop was voiceless (वाग्, तद्)
 * - the avagraha (ऽ) marks an initial a- swallowed by -o/-e: रामोऽपि = रामः + अपि */
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

export async function splitWords(tokens, lexicon) {
  const words = tokens.filter((t) => t.kind === 'word');
  const keys = new Set();
  for (const t of words) {
    keys.add(t.key);
    const [head, tail] = t.key.split('ऽ');
    if (tail !== undefined) { keys.add(head); for (const v of undoSandhi(head)) keys.add(v); keys.add(`अ${tail}`); }
    for (const v of undoSandhi(t.key)) keys.add(v);
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
    out.push(known(t.key) ? t : { ...t, key: rekey(t.key) });
  }
  return out;
}
