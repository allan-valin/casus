/* Sentence ends that LanguageTool does not see (Allan, 2026-10-22, German): it reads one line break as part of the same
 * sentence and, by default, leaves a paragraph that ends without a full stop alone. Two checks on the lines themselves:
 *  - a paragraph (or the text) ending in a word gets a full stop;
 *  - a line ending in a word, followed by a line, gets a full stop — and the next word a capital when it is lower case.
 * Left alone: lines ending in any punctuation, short lines (headings, list items), long lines (text wrapped when pasted),
 * and scripts without spaces between words (Japanese, Chinese). */

const NO_SPACES = new Set(['ja', 'zh']);
const LAST_WORD = /[\p{L}\p{N}][\p{L}\p{N}\p{M}'’-]*$/u;
const FIRST_WORD = /^[\p{L}\p{N}][\p{L}\p{N}\p{M}'’-]*/u;
const WRAPPED = 70;           // a line this long that just stops is most likely wrapped prose, not a sentence end
const HEADING = 4;            // fewer words than this at a paragraph end: a heading or a list item

/** issues in the shape the proofreader merges: { kind, categoryId, offset, length, message, short, rule, replacements } */
export function layoutIssues(text, { messages, code = '' } = {}) {
  if (NO_SPACES.has(code) || !text) return [];
  const lines = [];
  let at = 0;
  for (const raw of text.split('\n')) { lines.push({ raw, start: at }); at += raw.length + 1; }
  const out = [];
  const period = (line) => {
    const body = line.raw.replace(/\s+$/, '');
    const w = body.match(LAST_WORD);
    out.push({ kind: 'grammar', categoryId: 'PUNCTUATION', rule: 'CASUS_LINE_END', short: '', message: messages.period,
      offset: line.start + w.index, length: w[0].length, replacements: [`${w[0]}.`] });
  };
  lines.forEach((line, i) => {
    const body = line.raw.replace(/\s+$/, '');
    if (!body.trim() || !/[\p{L}\p{N}]$/u.test(body)) return;
    const words = body.trim().split(/\s+/).length;
    const next = lines[i + 1];
    if (!next || !next.raw.trim()) { if (words >= HEADING) period(line); return; }
    if (body.length >= WRAPPED) return;
    const lead = next.raw.length - next.raw.trimStart().length;
    const w = next.raw.slice(lead).match(FIRST_WORD);
    if (!w) return;
    const first = w[0][0];
    if (first !== first.toUpperCase()) {                      // lower case: clearly a new sentence that lost its stop
      period(line);
      out.push({ kind: 'grammar', categoryId: 'CASING', rule: 'CASUS_LINE_CAPITAL', short: '', message: messages.capital,
        offset: next.start + lead, length: w[0].length, replacements: [first.toUpperCase() + w[0].slice(1)] });
    } else if (first !== first.toLowerCase() && words >= 3) {  // upper case: a sentence end without its stop
      period(line);
    }
  });
  return out;
}
