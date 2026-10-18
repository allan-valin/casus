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

export const ROWS = ['α-ε', 'ζ-κ', 'λ-ο', 'π-τ', 'υ-ω', 'breathings'].map((id) => ({ id, letters: LETTERS.filter((l) => l.row === id) }));

const clean = (s) => s.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');

export function createGame({ rows, mode = 'name', random = Math.random, capitals = false }) {
  const pool = LETTERS.filter((l) => rows.includes(l.row));
  if (pool.length === 0) throw new Error('choose at least one row');
  const weak = [];                       // { letter, wait }: a missed letter comes back when wait reaches 0
  const score = { right: 0, total: 0 };
  let streak = 0;
  let current = draw();
  let upper = capitals && random() < 0.5;

  function draw() {
    for (const w of weak) w.wait -= 1;
    const due = weak.findIndex((w) => w.wait <= 0);
    if (due >= 0) return weak.splice(due, 1)[0].letter;
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  }
  return {
    current: () => current,
    shown: () => (upper ? current.upper : current.lower),
    get score() { return { ...score }; },
    get streak() { return streak; },
    get mode() { return mode; },
    answer(text) {
      const accepted = mode === 'sound' ? current.sounds : current.names;
      const correct = accepted.includes(clean(text));
      score.total += 1;
      if (correct) { score.right += 1; streak += 1; } else { streak = 0; weak.push({ letter: current, wait: 2 }); }
      return { correct, expected: accepted[0] };
    },
    next() { current = draw(); upper = capitals && random() < 0.5; return current; },
  };
}
