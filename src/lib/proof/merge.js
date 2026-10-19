/** spelling and grammar issues in text order; a spelling issue inside one LanguageTool already reports is dropped */
export function mergeIssues(spelling, grammar) {
  const covered = (s) => grammar.some((g) => s.offset < g.offset + g.length && g.offset < s.offset + s.length);
  return [...grammar, ...spelling.filter((s) => !covered(s))].sort((a, b) => a.offset - b.offset);
}
