/* The Greek alphabet drill (languages design §7; modelled on kana-quiz): choose rows, see a letter,
 * type its name or its sound, instant mark, score and streak; a missed letter comes back within three. */
const L = (lower, upper, names, sounds, row, spoken) => ({ lower, upper, names, sounds, row, spoken });

export const LETTERS = [
  L('α', 'Α', ['alpha', 'alfa'], ['a'], 'α-ε', 'ἄλφα'),
  L('β', 'Β', ['beta', 'vita'], ['b'], 'α-ε', 'βῆτα'),
  L('γ', 'Γ', ['gamma'], ['g'], 'α-ε', 'γάμμα'),
  L('δ', 'Δ', ['delta'], ['d'], 'α-ε', 'δέλτα'),
  L('ε', 'Ε', ['epsilon'], ['e'], 'α-ε', 'ἒ ψιλόν'),
  L('ζ', 'Ζ', ['zeta', 'zita'], ['z', 'zd', 'dz'], 'ζ-κ', 'ζῆτα'),
  L('η', 'Η', ['eta', 'ita'], ['e', 'ē', 'ee'], 'ζ-κ', 'ἦτα'),
  L('θ', 'Θ', ['theta', 'thita'], ['th'], 'ζ-κ', 'θῆτα'),
  L('ι', 'Ι', ['iota', 'giota'], ['i'], 'ζ-κ', 'ἰῶτα'),
  L('κ', 'Κ', ['kappa', 'kapa'], ['k', 'c'], 'ζ-κ', 'κάππα'),
  L('λ', 'Λ', ['lambda', 'lamda', 'labda'], ['l'], 'λ-ο', 'λάμβδα'),
  L('μ', 'Μ', ['mu', 'mi', 'my'], ['m'], 'λ-ο', 'μῦ'),
  L('ν', 'Ν', ['nu', 'ni', 'ny'], ['n'], 'λ-ο', 'νῦ'),
  L('ξ', 'Ξ', ['xi', 'ksi'], ['x', 'ks'], 'λ-ο', 'ξεῖ'),
  L('ο', 'Ο', ['omicron', 'omikron'], ['o'], 'λ-ο', 'ὂ μικρόν'),
  L('π', 'Π', ['pi'], ['p'], 'π-τ', 'πεῖ'),
  L('ρ', 'Ρ', ['rho', 'ro'], ['r', 'rh'], 'π-τ', 'ῥῶ'),
  L('σ', 'Σ', ['sigma'], ['s'], 'π-τ', 'σίγμα'),
  L('τ', 'Τ', ['tau', 'taf'], ['t'], 'π-τ', 'ταῦ'),
  L('υ', 'Υ', ['upsilon', 'ypsilon'], ['u', 'y', 'ü'], 'υ-ω', 'ὖ ψιλόν'),
  L('φ', 'Φ', ['phi', 'fi'], ['ph', 'f'], 'υ-ω', 'φεῖ'),
  L('χ', 'Χ', ['chi', 'khi', 'hi'], ['ch', 'kh'], 'υ-ω', 'χεῖ'),
  L('ψ', 'Ψ', ['psi'], ['ps'], 'υ-ω', 'ψεῖ'),
  L('ω', 'Ω', ['omega'], ['o', 'ō', 'oo'], 'υ-ω', 'ὦ μέγα'),
  // breathings: the h a rough breathing adds, nothing for a smooth one (sound mode)
  L('ἁ', 'Ἁ', ['rough alpha', 'alpha rough'], ['ha'], 'breathings', 'ἁ'),
  L('ἀ', 'Ἀ', ['smooth alpha', 'alpha smooth'], ['a'], 'breathings', 'ἀ'),
  L('ἑ', 'Ἑ', ['rough epsilon', 'epsilon rough'], ['he'], 'breathings', 'ἑ'),
  L('ὁ', 'Ὁ', ['rough omicron', 'omicron rough'], ['ho'], 'breathings', 'ὁ'),
  L('ὑ', 'Ὑ', ['rough upsilon', 'upsilon rough'], ['hu', 'hy'], 'breathings', 'ὑ'),
  L('ῥ', 'Ῥ', ['rough rho', 'rho rough'], ['rh'], 'breathings', 'ῥ'),
];

// Small letters and capitals are separate rows: a capital is a different shape with the same sound
// (Allan, 2026-10-18). Breathings come in small letters only.
const SMALL = ['α-ε', 'ζ-κ', 'λ-ο', 'π-τ', 'υ-ω'];
const CAPITAL = { 'α-ε': 'Α-Ε', 'ζ-κ': 'Ζ-Κ', 'λ-ο': 'Λ-Ο', 'π-τ': 'Π-Τ', 'υ-ω': 'Υ-Ω' };
export const ROWS = [
  ...SMALL.map((id) => ({ id, items: LETTERS.filter((l) => l.row === id).map((letter) => ({ glyph: letter.lower, letter })) })),
  ...SMALL.map((id) => ({ id: CAPITAL[id], capital: true, items: LETTERS.filter((l) => l.row === id).map((letter) => ({ glyph: letter.upper, letter })) })),
  { id: 'breathings', items: LETTERS.filter((l) => l.row === 'breathings').map((letter) => ({ glyph: letter.lower, letter })) },
];

const clean = (s) => s.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
const accepted = (letter, mode) => (mode === 'name' ? letter.names : letter.sounds);

function itemsOf(rows) {
  const items = ROWS.filter((r) => rows.includes(r.id)).flatMap((r) => r.items);
  if (items.length === 0) throw new Error('choose at least one row');
  return items;
}

/** One letter at a time. `mode` 'sound' (default) or 'name'. */
export function createGame({ rows, mode = 'sound', random = Math.random }) {
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
export function createGrid({ rows, mode = 'sound', random = Math.random, shuffle = true }) {
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
