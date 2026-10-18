/* The dictionary period (spec §8). Labels carry dates and example authors so a reader outside
 * classics understands the control at a glance (feedback D13). */
export const ERAS = [
  { id: 'archaic', label: 'Archaic & early Latin (before c. 80 BC)', authors: 'Plautus, Cato, Ennius', ages: ['A', 'B'] },
  { id: 'classical', label: 'Classical Latin (c. 80 BC – AD 120)', authors: 'Cicero, Caesar, Virgil, Ovid, Tacitus', ages: ['C'] },
  { id: 'late', label: 'Late Latin (AD 120 – 600)', authors: 'Church Fathers, the Vulgate, Boethius', ages: ['D', 'E'] },
  { id: 'medieval', label: 'Medieval Latin (600 – 1400)', authors: 'Bede, Aquinas, chronicles, charters', ages: ['F'] },
  { id: 'neo', label: 'Renaissance & Neo-Latin (1400 onwards)', authors: 'Erasmus, Newton, scientific Latin', ages: ['G', 'H'] },
];

export const AGE_LABEL = {
  X: 'unknown', A: 'archaic', B: 'early', C: 'classical', D: 'late', E: 'later', F: 'medieval', G: 'neo-Latin', H: 'modern',
};

function indexOfAge(age) {
  return ERAS.findIndex((e) => e.ages.includes(age));
}

/** 'in' | 'near' | 'out' | 'unknown' — how far a lemma's Whitaker age sits from the reader's period. */
export function eraStatus(age, eraId) {
  const here = ERAS.findIndex((e) => e.id === eraId);
  const there = indexOfAge(age);
  if (there < 0 || here < 0) return 'unknown';
  const d = Math.abs(here - there);
  return d === 0 ? 'in' : d === 1 ? 'near' : 'out';
}

/** Spec §8: a warning when a word's only attestation is far from the text's period. */
export function warning(age, eraId) {
  if (eraStatus(age, eraId) !== 'out') return null;
  const era = ERAS.find((e) => e.id === eraId);
  return `only attested as ${AGE_LABEL[age]}; the text is ${era.label.split(' (')[0].toLowerCase()}`;
}
