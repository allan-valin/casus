/* Turkish copula -DIr "is" (Allan, 2026-10-19: yıldızıdır, benimdir were unknown): split off a word the dictionary
 * knows, and read as the 3rd person "is". The suffix follows vowel harmony (ı i u ü) and hardens after a voiceless
 * consonant (-tır). */
const COPULA = ['dır', 'dir', 'dur', 'dür', 'tır', 'tir', 'tur', 'tür'];

export async function splitWords(tokens, lexicon) {
  const keys = new Set();
  for (const t of tokens) {
    if (t.kind !== 'word') continue;
    keys.add(t.key);
    for (const c of COPULA) if (t.key.endsWith(c) && t.key.length > c.length + 1) keys.add(t.key.slice(0, -c.length));
  }
  const found = await lexicon.lookupAll([...keys]);
  const known = (k) => (found.get(k) ?? []).length > 0;
  const out = [];
  for (const t of tokens) {
    const c = t.kind === 'word' && !known(t.key) && COPULA.find((x) => t.key.endsWith(x) && t.key.length > x.length + 1 && known(t.key.slice(0, -x.length)));
    if (!c) { out.push(t); continue; }
    const cut = t.surface.length - c.length;
    out.push({ ...t, surface: t.surface.slice(0, cut), key: t.key.slice(0, -c.length), end: t.start + cut });
    out.push({ surface: t.surface.slice(cut), kind: 'word', key: c, start: t.start + cut, end: t.end, enclitic: null, copula: true });
  }
  return out;
}

export function copulaStage(blocks) {
  return blocks.map((b) => (b.token.copula && !b.pinned
    ? { ...b, candidates: [{ analysis: { lemma: 'imek', pos: 'verb', copula: true, person: '3', number: 'sg', tense: 'pres', mood: 'ind' }, reasons: ['the copula -DIr “is”'], links: [] }] }
    : b));
}
