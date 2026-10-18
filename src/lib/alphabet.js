/* The alphabet drill shared by every non-Latin script (Greek letters, Japanese kana…; languages design §7, modelled on
 * kana-quiz): rows of glyphs, answer by sound (or name); one at a time, or all at once in a grid. */
export function makeAlphabetGame(ROWS) {
const clean = (s) => s.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
const accepted = (letter, mode) => (mode === 'name' ? letter.names : letter.sounds);

function itemsOf(rows) {
  const items = ROWS.filter((r) => rows.includes(r.id)).flatMap((r) => r.items);
  if (items.length === 0) throw new Error('choose at least one row');
  return items;
}

/** One letter at a time. `mode` 'sound' (default) or 'name'. */
function createGame({ rows, mode = 'sound', random = Math.random }) {
  const pool = itemsOf(rows);
  const weak = [];                       // { item, wait }: a missed glyph comes back when wait reaches 0
  const score = { right: 0, total: 0 };
  let streak = 0;
  let current = draw();

  function draw() {
    for (const w of weak) w.wait -= 1;
    const due = weak.findIndex((w) => w.wait <= 0);
    if (due >= 0) return weak.splice(due, 1)[0].item;
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  }
  return {
    current: () => current.letter,
    shown: () => current.glyph,
    get score() { return { ...score }; },
    get streak() { return streak; },
    get mode() { return mode; },
    answer(text) {
      const ok = accepted(current.letter, mode);
      const correct = ok.includes(clean(text));
      score.total += 1;
      if (correct) { score.right += 1; streak += 1; } else { streak = 0; weak.push({ item: current, wait: 2 }); }
      return { correct, expected: ok[0] };
    },
    next() { current = draw(); return current.letter; },
  };
}

/** Every glyph of the chosen rows at once; fill the gaps in any order (Allan's preferred mode). */
function createGrid({ rows, mode = 'sound', random = Math.random, shuffle = true }) {
  const items = [...itemsOf(rows)];
  if (shuffle) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  }
  const cells = items.map((it) => ({ glyph: it.glyph, letter: it.letter, state: 'empty', tries: 0, typed: '' }));
  const score = () => ({
    right: cells.filter((c) => c.state === 'right').length,
    firstTry: cells.filter((c) => c.state === 'right' && c.tries === 1).length,
    total: cells.length,
    done: cells.every((c) => c.state === 'right' || c.state === 'revealed'),
  });
  return {
    cells,
    get mode() { return mode; },
    get score() { return score(); },
    /** -> { correct, expected }, or null when the answer is empty (the cell is left for later) */
    check(i, text) {
      const c = cells[i];
      const ok = accepted(c.letter, mode);
      if (c.state === 'right' || c.state === 'revealed') return { correct: c.state === 'right', expected: ok[0] };
      if (!clean(text)) return null;
      c.tries += 1;
      c.typed = text;
      const correct = ok.includes(clean(text));
      c.state = correct ? 'right' : 'wrong';
      return { correct, expected: ok[0] };
    },
    reveal() { for (const c of cells) if (c.state !== 'right') c.state = 'revealed'; },
  };
}

  return { createGame, createGrid };
}
