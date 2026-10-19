/* Macedonian: a word with real readings drops the name of the letter it spells and its interjection reading, except
 * as the first word of the sentence (е is "is", not the letter е or "eh"). */
export function letterStage(blocks) {
  return blocks.map((b, i) => {
    const weak = (c) => c.analysis.pos === 'interj' || (c.analysis.pos === 'noun' && !c.analysis.case);
    const strong = b.candidates.filter((c) => !weak(c));
    if (i === 0 && b.candidates.every((c) => c.analysis.pos === 'interj' || weak(c))) return b;
    if (!strong.length || strong.length === b.candidates.length || b.pinned) return b;
    return { ...b, candidates: strong.map((c) => (c.reasons.includes('a real reading wins') ? c : { ...c, reasons: [...c.reasons, 'a real reading wins over the letter name or interjection'] })) };
  });
}
