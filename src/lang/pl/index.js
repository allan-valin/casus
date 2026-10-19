/* Polish (docs/languages/pl.md; overnight 2026-10-19): seven cases, prepositions with theirs. */
import { makeCaseLanguage } from '../caseLanguage.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const polish = makeCaseLanguage({
  code: 'pl', name: { en: 'Polish', pt: 'Polonês' }, inText: { en: 'Polish', pt: 'polonês' }, bcp47: 'pl', wiktionary: 'Polish',
  cases: [C('nom', 'Nm', 'nominative (mianownik)', 'nominativo'), C('gen', 'Gn', 'genitive (dopełniacz)', 'genitivo'), C('dat', 'Dt', 'dative (celownik)', 'dativo'),
    C('acc', 'Ac', 'accusative (biernik)', 'acusativo'), C('ins', 'In', 'instrumental (narzędnik)', 'instrumental'), C('loc', 'Lc', 'locative (miejscownik)', 'locativo'), C('voc', 'Vc', 'vocative (wołacz)', 'vocativo')],
  hues: ['nom', 'gen', 'dat', 'acc', 'ins', 'loc'], shares: { voc: 'nom' }, borders: { voc: 'dotted' },
  government: { w: ['loc', 'acc'], we: ['loc', 'acc'], na: ['loc', 'acc'], z: ['gen', 'ins'], ze: ['gen', 'ins'], do: ['gen'], od: ['gen'], dla: ['gen'], bez: ['gen'], u: ['gen'],
    o: ['loc', 'acc'], po: ['loc', 'acc'], przy: ['loc'], przez: ['acc'], za: ['ins', 'acc'], przed: ['ins'], pod: ['ins', 'acc'], nad: ['ins', 'acc'], między: ['ins'],
    ku: ['dat'], dzięki: ['dat'], przeciw: ['dat'], przeciwko: ['dat'], obok: ['gen'], koło: ['gen'], według: ['gen'], podczas: ['gen'] },
  and: ['i', 'a', 'oraz', 'lub', 'albo'], copulas: ['jest', 'są', 'był', 'była', 'było', 'byli', 'jestem', 'jesteś', 'jesteśmy'],
  pronounPerson: { ja: '1', ty: '2', on: '3', ona: '3', ono: '3', my: '1', wy: '2', oni: '3', one: '3' },
  codes: CODES, voice: { espeak: 'pl', natural: { voiceId: 'pl_PL-gosia-medium', name: 'Gosia', sizeMB: 63 } }, address: [],
});
