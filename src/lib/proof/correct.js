/* Proofreading helpers (Allan, 2026-10-19: colours by kind of mistake, a corrected version to copy, marks that
 * follow the text as it is typed). */

const TYPE_OF_CATEGORY = { TYPOS: 'spelling', PUNCTUATION: 'punctuation', TYPOGRAPHY: 'punctuation', STYLE: 'style', REDUNDANCY: 'style',
  SEMANTICS: 'style', PLAIN_ENGLISH: 'style', COLLOQUIALISMS: 'style', REGIONALISMS: 'style', CASING: 'casing',
  GRAMMAR: 'grammar', CONFUSED_WORDS: 'grammar', COMPOUNDING: 'grammar' };
/** spelling (red), grammar (blue), punctuation (orange), style (purple), casing (teal) */
export function typeOf(issue) {
  if (issue.kind === 'spelling') return 'spelling';
  return TYPE_OF_CATEGORY[issue.categoryId] ?? 'grammar';
}

/** each issue's first suggestion applied: { text, changes: [{ offset, length }] in the new text } */
export function corrected(text, issues) {
  const usable = [...issues].filter((i) => i.replacements?.length).sort((a, b) => a.offset - b.offset);
  let out = '';
  let at = 0;
  const changes = [];
  for (const i of usable) {
    if (i.offset < at) continue;
    out += text.slice(at, i.offset);
    changes.push({ offset: out.length, length: i.replacements[0].length });
    out += i.replacements[0];
    at = i.offset + i.length;
  }
  return { text: out + text.slice(at), changes };
}

/** the issues of `before` placed in `after`: marks after the edit move, marks it touches go */
export function shiftIssues(before, after, issues) {
  let p = 0;
  while (p < before.length && p < after.length && before[p] === after[p]) p += 1;
  let s = 0;
  while (s < before.length - p && s < after.length - p && before[before.length - 1 - s] === after[after.length - 1 - s]) s += 1;
  const editEnd = before.length - s;
  const delta = after.length - before.length;
  return issues.flatMap((i) => {
    if (i.offset + i.length <= p) return [i];
    if (i.offset >= editEnd) return [{ ...i, offset: i.offset + delta }];
    return [];
  });
}
