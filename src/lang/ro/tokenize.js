/*
 * Romanian joins short words with a hyphen (2026-10-21): ca-n = ca în, mândră-n = mândră în, într-o = într o,
 * s-a = se a, n-am = nu am, l-am = îl am, mi-a = îmi a. A hyphenated word the dictionary lacks is read as its pieces,
 * each clipped piece standing for its full word.
 */
const CLIPPED = { n: 'în', l: 'îl', s: 'se', m: 'mă', v: 'vă', i: 'îi', mi: 'îmi', ți: 'îți', ţi: 'îți', și: 'își', şi: 'își', o: 'o', a: 'a', am: 'am', ai: 'ai', au: 'au', ne: 'ne', le: 'le', te: 'te', nu: 'nu' };
const FIRST = { n: 'nu', s: 'se', l: 'îl', m: 'mă', v: 'vă', i: 'îi', mi: 'îmi', ți: 'îți', ţi: 'îți', și: 'își', şi: 'își', într: 'într', dintr: 'dintr', printr: 'printr' };

export async function splitWords(tokens, lexicon) {
  const words = tokens.filter((t) => t.kind === 'word' && t.surface.includes('-'));
  if (!words.length) return tokens;
  const keys = new Set();
  for (const t of words) { keys.add(t.key); for (const p of t.key.split('-')) if (p) keys.add(p); }
  const found = await lexicon.lookupAll([...keys]);
  const known = (k) => (found.get(k) ?? []).length > 0;
  const out = [];
  for (const t of tokens) {
    if (t.kind !== 'word' || !t.surface.includes('-') || known(t.key)) { out.push(t); continue; }
    const parts = t.surface.split('-');
    let at = t.start;
    parts.forEach((p, k) => {
      if (!p) { at += 1; return; }
      const low = p.toLowerCase();
      const key = (k === 0 ? FIRST[low] : CLIPPED[low]) ?? (known(low) ? low : low);
      out.push({ surface: p, kind: 'word', key, start: at, end: at + p.length, enclitic: null });
      at += p.length + 1;
    });
  }
  return out;
}
