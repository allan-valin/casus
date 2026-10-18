/* The Greek alphabet drill (languages design §7; modelled on kana-quiz): choose rows, see a letter,
 * type its name or its sound, instant mark, score and streak; a missed letter comes back within three. */
import { makeAlphabetGame } from '../../lib/alphabet.js';

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

// the drill itself is shared by every alphabet (src/lib/alphabet.js)
const game = makeAlphabetGame(ROWS);
export const { createGame, createGrid } = game;
