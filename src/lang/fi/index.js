/* Finnish (docs/languages/fi.md; overnight 2026-10-19): fifteen cases on six hues — grammatical (nominative, genitive,
 * partitive), inner local (inessive, elative, illative), outer local (adessive, ablative, allative), and the rest
 * (essive, translative, instructive, abessive, comitative) — each sharing case with its own border and badge. */
import { makeCaseLanguage } from '../caseLanguage.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const finnish = makeCaseLanguage({
  code: 'fi',
  name: { en: 'Finnish', pt: 'Finlandês' },
  inText: { en: 'Finnish', pt: 'finlandês' },
  bcp47: 'fi',
  wiktionary: 'Finnish',
  cases: [
    C('nom', 'Nom', 'nominative', 'nominativo'), C('gen', 'Gen', 'genitive', 'genitivo'), C('par', 'Par', 'partitive', 'partitivo'),
    C('acc', 'Acc', 'accusative', 'acusativo'), C('ine', 'Ine', 'inessive (in)', 'inessivo (em)'), C('ela', 'Ela', 'elative (out of)', 'elativo (de dentro de)'),
    C('ill', 'Ill', 'illative (into)', 'ilativo (para dentro de)'), C('ade', 'Ade', 'adessive (on, at)', 'adessivo (sobre, em)'),
    C('abl', 'Abl', 'ablative (off, from)', 'ablativo (de cima de)'), C('all', 'All', 'allative (onto, to)', 'alativo (para cima de)'),
    C('ess', 'Ess', 'essive (as)', 'essivo (como)'), C('tra', 'Tra', 'translative (becoming)', 'translativo (tornando-se)'),
    C('ins', 'Ins', 'instructive (by means of)', 'instrutivo (por meio de)'), C('abe', 'Abe', 'abessive (without)', 'abessivo (sem)'),
    C('com', 'Com', 'comitative (together with)', 'comitativo (junto com)'),
  ],
  hues: ['nom', 'gen', 'par', 'ine', 'ade', 'ess'],
  shares: { acc: 'nom', ela: 'ine', ill: 'ine', abl: 'ade', all: 'ade', tra: 'ess', ins: 'ess', abe: 'ess', com: 'ess' },
  borders: { acc: 'double', ela: 'double', ill: 'dotted', abl: 'double', all: 'dotted', tra: 'double', ins: 'dotted', abe: 'groove', com: 'ridge' },
  and: ['ja', 'tai', 'sekä'],
  copulas: ['on', 'ovat', 'oli', 'olivat', 'olen', 'olet', 'olemme', 'olette'],
  codes: CODES,
  voice: { espeak: 'fi', natural: { voiceId: 'fi_FI-harri-medium', name: 'Harri', sizeMB: 63 } },
});
