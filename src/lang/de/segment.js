/* German sentences end at . ? ! — not after a common abbreviation (z. B., usw., Nr.) nor after an
 * ordinal number (3. Oktober). Returns { text, start, end } like Latin's. */
// abbreviations that never end a sentence (a name or a noun follows them); usw. and etc. can end one,
// so they go by the general rule (a capital after them ends the sentence: review I6)
const ABBREVIATIONS = new Set(['z', 'b', 'd', 'h', 'bzw', 'nr', 's', 'dr', 'hr', 'fr', 'ca', 'vgl', 'u', 'a', 'st', 'str', 'jh', 'evtl', 'ggf', 'inkl', 'max', 'min', 'prof', 'bspw', 'o', 'ä', 'v', 'chr']);

export function segment(text) {
  const out = [];
  let start = 0;
  const push = (end) => {
    const slice = text.slice(start, end);
    const lead = slice.length - slice.trimStart().length;
    const trimmed = slice.trim();
    if (trimmed) out.push({ text: trimmed, start: start + lead, end: start + lead + trimmed.length });
    start = end;
  };
  const re = /[.?!]+/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const end = m.index + m[0].length;
    if (m[0] === '.') {
      const before = text.slice(0, m.index).match(/(\S+)$/)?.[1] ?? '';
      const word = before.replace(/^.*[^\p{L}\d]/u, '').toLowerCase();
      // a one- or two-digit number before a dot is an ordinal (3. Oktober); a year ends the sentence
      if (/^\d{1,2}$/.test(word) || ABBREVIATIONS.has(word)) continue;
      // a sentence ends only before white space and a capital, a digit or the end of the text
      const after = text.slice(end);
      if (after && !/^\s+[\p{Lu}\d"„»(]/u.test(after) && !/^\s*$/.test(after)) continue;
    }
    push(end);
  }
  push(text.length);
  return out;
}
