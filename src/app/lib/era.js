export const ERAS = [
  { id: 'archaic', label: 'Archaic / early (to c. 80 BC)', ages: ['A', 'B'] },
  { id: 'classical', label: 'Classical (Cicero to Trajan)', ages: ['C'] },
  { id: 'late', label: 'Late (to c. 600)', ages: ['D', 'E'] },
  { id: 'medieval', label: 'Medieval', ages: ['F'] },
  { id: 'neo', label: 'Renaissance / Neo-Latin / modern', ages: ['G', 'H'] },
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
