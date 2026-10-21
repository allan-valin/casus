/* Tagalog keys (2026-10-21): lower case without the dictionaries' stress and glottal marks (aklát, bumasâ).
 * Mirror of tools/casus_build/generic.py _strip_tl. */
export const stripTl = (s) => s.toLowerCase().normalize('NFD').replace(/[̀́̂]/g, '').normalize('NFC');
export const hasMarksTl = (s) => /[̀́̂]/.test(s.normalize('NFD'));
