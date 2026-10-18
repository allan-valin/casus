/* Japanese sentences end at 。！？ (and ASCII !?), and at line breaks. Returns { text, start, end }. */
const END = /[。！？!?]+|\n+/g;

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
  for (let m = END.exec(text); m; m = END.exec(text)) push(m.index + m[0].length);
  push(text.length);
  return out;
}
