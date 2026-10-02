const ABBREVIATIONS = new Set([
  'a', 'c', 'cn', 'd', 'l', 'm', 'p', 'q', 's', 't', 'ti', 'sex', 'ser', 'app',
  'kal', 'non', 'id', 'cos', 'coss', 'pr', 'des', 'f', 'n', 'apr', 'mai', 'iun', 'iul',
  'sept', 'oct', 'nov', 'dec', 'ian', 'feb', 'mart', 'imp',
]);
// Upper case only: `vici`, `dixi`, `mimi` are words made of Roman letters.
const ROMAN = /^[IVXLCDM]+$/;
const CLOSERS = new Set(['"', '”', '’', "'", ')', ']', '»']);

/**
 * Split text into sentences on `.` `?` `!`, guarding abbreviations, Roman
 * numerals and ellipses. Returns half-open ranges into the original string so
 * the left pane can highlight the exact span; `text` is the trimmed slice.
 */
export function segment(text) {
  const out = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== '.' && ch !== '?' && ch !== '!') continue;
    if (ch === '.' && isGuarded(text, i)) continue;
    let end = i + 1;
    while (end < text.length && CLOSERS.has(text[end])) end += 1;
    pushSpan(out, text, start, end);
    start = end;
    i = end - 1;
  }
  pushSpan(out, text, start, text.length);
  return out;
}

function isGuarded(text, i) {
  if (text[i + 1] === '.' || text[i - 1] === '.') return true; // ellipsis
  const before = /([A-Za-z]+)$/.exec(text.slice(0, i));
  if (!before) return false;
  return ABBREVIATIONS.has(before[1].toLowerCase()) || ROMAN.test(before[1]);
}

function pushSpan(out, text, start, end) {
  const slice = text.slice(start, end);
  if (!slice.trim()) return;
  const lead = slice.length - slice.trimStart().length;
  const trail = slice.length - slice.trimEnd().length;
  out.push({ start: start + lead, end: end - trail, text: slice.trim() });
}
