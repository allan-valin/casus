/* Tagalog (2026-10-21; docs/languages/tl.md). No cases: the colours are the roles the phrase markers give — ang / si
 * the topic, ng / ni the non-topic, sa / kay the oblique; verbs by aspect (completive, progressive, contemplative). */
import { makeCaseLanguage } from '../caseLanguage.js';
import { closedStage, roleStage, splitWords } from './stages.js';
import { stripTl, hasMarksTl } from './script.js';
import CODES from './codes.js';

const C = (id, badge, en, pt) => ({ id, badge, en, pt });
export const tagalog = { ...makeCaseLanguage({
  code: 'tl', name: { en: 'Tagalog', pt: 'Tagalo' }, inText: { en: 'Tagalog', pt: 'tagalo' }, bcp47: 'tl', wiktionary: 'Tagalog',
  cases: [C('top', 'Top', 'topic (ang, si)', 'tópico (ang, si)'), C('ng', 'Ng', 'non-topic (ng, ni)', 'não tópico (ng, ni)'), C('obl', 'Obl', 'oblique (sa, kay)', 'oblíquo (sa, kay)')],
  hues: ['top', 'ng', 'obl'],
  and: ['at', 'o'], copulas: ['ay'],
  codes: CODES, voice: { espeak: 'tl' }, address: [],
  script: { prefixOf: stripTl, strip: stripTl, hasMarks: hasMarksTl },
  splitWords, preStages: [closedStage], extraStages: [roleStage],
  eras: [{ id: 'modern', label: 'Modern Tagalog', authors: '', ages: [], ipa: [] }],
}), noNounEndings: true };
