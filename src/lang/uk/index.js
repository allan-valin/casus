/* Ukrainian (2026-10-20; docs/languages/uk.md): seven cases, prepositions with theirs. */
import { makeCaseLanguage } from '../caseLanguage.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const ukrainian = makeCaseLanguage({
  code: 'uk', name: { en: 'Ukrainian', pt: 'Ucraniano' }, inText: { en: 'Ukrainian', pt: 'ucraniano' }, bcp47: 'uk', wiktionary: 'Ukrainian',
  cases: [C('nom', 'Nm', 'nominative (називний)', 'nominativo'), C('gen', 'Gn', 'genitive (родовий)', 'genitivo'), C('dat', 'Dt', 'dative (давальний)', 'dativo'),
    C('acc', 'Ac', 'accusative (знахідний)', 'acusativo'), C('ins', 'In', 'instrumental (орудний)', 'instrumental'), C('loc', 'Lc', 'locative (місцевий)', 'locativo'), C('voc', 'Vc', 'vocative (кличний)', 'vocativo')],
  hues: ['nom', 'gen', 'dat', 'acc', 'ins', 'loc'], shares: { voc: 'nom' }, borders: { voc: 'dotted' },
  government: { в: ['loc', 'acc'], у: ['loc', 'acc'], на: ['loc', 'acc'], з: ['gen', 'ins'], із: ['gen', 'ins'], зі: ['gen', 'ins'], до: ['gen'], від: ['gen'], для: ['gen'], без: ['gen'],
    біля: ['gen'], після: ['gen'], крім: ['gen'], серед: ['gen'], о: ['loc', 'acc'], об: ['loc', 'acc'], по: ['loc', 'dat'], при: ['loc'], через: ['acc'], про: ['acc'],
    за: ['ins', 'acc'], перед: ['ins'], під: ['ins', 'acc'], над: ['ins'], між: ['ins'], проти: ['gen'], завдяки: ['dat'], всупереч: ['dat'] },
  and: ['і', 'й', 'та', 'а', 'або', 'чи'], copulas: ['є', 'був', 'була', 'було', 'були', 'буде', 'будуть'],
  pronounPerson: { я: '1', ти: '2', він: '3', вона: '3', воно: '3', ми: '1', ви: '2', вони: '3' },
  codes: CODES, voice: { espeak: 'uk', natural: { voiceId: 'uk_UA-ukrainian_tts-medium', name: 'Ukrainian TTS', sizeMB: 73 } }, address: [],
});
