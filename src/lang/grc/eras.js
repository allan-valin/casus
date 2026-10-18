/* Periods for the dictionary-period control (docs/languages/grc.md §6). Greek data carries no
 * attestation period per lemma, so the period chooses the pronunciation (the Wiktionary IPA note). */
export const GREEK_ERAS = [
  { id: 'homeric', label: 'Homeric & Archaic (8th–6th c. BC)', authors: 'Homer, Hesiod, the lyric poets', ages: [], ipa: ['5th BCE Attic'] },
  { id: 'classical', label: 'Classical Attic (5th–4th c. BC)', authors: 'Plato, Thucydides, the tragedians, Xenophon', ages: [], ipa: ['5th BCE Attic'] },
  { id: 'koine', label: 'Koine (3rd c. BC – 4th c. AD)', authors: 'the Septuagint, the New Testament, Polybius, Plutarch', ages: [], ipa: ['4th CE Koine', '1st CE Egyptian'] },
  { id: 'byzantine', label: 'Byzantine (5th–15th c.)', authors: 'the Church Fathers, Psellos, Anna Komnene', ages: [], ipa: ['10th CE Byzantine'] },
  { id: 'modern', label: 'Learned modern reading', authors: 'school and church pronunciation today', ages: [], ipa: ['15th CE Constantinopolitan'] },
];
