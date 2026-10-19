/* The Modern Greek alphabet drill: 24 letters, small and capital, with their modern names and sounds (β v, η i, υ i…). */
import { makeAlphabetGame } from '../../lib/alphabet.js';

const L = (lower, names, sounds, row) => ({ lower, upper: lower.toUpperCase(), names, sounds, row, spoken: lower });
export const LETTERS = [
  L('α', ['alfa', 'alpha'], ['a'], 'α'), L('β', ['vita', 'beta'], ['v'], 'α'), L('γ', ['gama', 'gamma'], ['g', 'gh', 'y'], 'α'), L('δ', ['delta', 'thelta'], ['d', 'dh', 'th'], 'α'),
  L('ε', ['epsilon', 'epsilo'], ['e'], 'ε'), L('ζ', ['zita', 'zeta'], ['z'], 'ε'), L('η', ['ita', 'eta'], ['i'], 'ε'), L('θ', ['thita', 'theta'], ['th'], 'ε'),
  L('ι', ['giota', 'iota', 'yota'], ['i'], 'ι'), L('κ', ['kapa', 'kappa'], ['k'], 'ι'), L('λ', ['lamda', 'lambda'], ['l'], 'ι'), L('μ', ['mi', 'mu'], ['m'], 'ι'),
  L('ν', ['ni', 'nu'], ['n'], 'ν'), L('ξ', ['xi', 'ksi'], ['x', 'ks'], 'ν'), L('ο', ['omikron', 'omicron'], ['o'], 'ν'), L('π', ['pi'], ['p'], 'ν'),
  L('ρ', ['ro', 'rho'], ['r'], 'ρ'), L('σ', ['sigma'], ['s'], 'ρ'), L('τ', ['taf', 'tau'], ['t'], 'ρ'), L('υ', ['ipsilon', 'upsilon', 'ypsilon'], ['i', 'y'], 'ρ'),
  L('φ', ['fi', 'phi'], ['f'], 'φ'), L('χ', ['chi', 'hi', 'khi'], ['ch', 'h', 'kh'], 'φ'), L('ψ', ['psi'], ['ps'], 'φ'), L('ω', ['omega'], ['o'], 'φ'),
];
const IDS = ['α', 'ε', 'ι', 'ν', 'ρ', 'φ'];
export const ROWS = [
  ...IDS.map((id) => ({ id, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.lower, letter: l })) })),
  ...IDS.map((id) => ({ id: id.toUpperCase(), capital: true, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.upper, letter: l })) })),
];
export const { createGame, createGrid } = makeAlphabetGame(ROWS);
