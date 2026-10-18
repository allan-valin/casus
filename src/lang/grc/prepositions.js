/* Ancient Greek prepositions and the cases they govern (docs/languages/grc.md §4; Smyth 1681–1702),
 * keyed by normalizeGrc() so a grave-accented preposition in running text (πρὸς) finds its entry. */
import { normalizeGrc } from './normalize.js';

const TABLE = {
  'ἀντί': ['gen'], 'ἀπό': ['gen'], 'ἐκ': ['gen'], 'ἐξ': ['gen'], 'πρό': ['gen'],
  'ἐν': ['dat'], 'σύν': ['dat'], 'ξύν': ['dat'],
  'ἀνά': ['acc'], 'εἰς': ['acc'], 'ἐς': ['acc'],
  'διά': ['gen', 'acc'], 'κατά': ['gen', 'acc'], 'μετά': ['gen', 'acc'], 'ὑπέρ': ['gen', 'acc'],
  'ἀμφί': ['gen', 'dat', 'acc'], 'ἐπί': ['gen', 'dat', 'acc'], 'παρά': ['gen', 'dat', 'acc'],
  'περί': ['gen', 'dat', 'acc'], 'πρός': ['gen', 'dat', 'acc'], 'ὑπό': ['gen', 'dat', 'acc'],
};

export const GOVERNMENT = Object.fromEntries(Object.entries(TABLE).map(([k, v]) => [normalizeGrc(k), v]));
