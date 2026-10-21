/* Bengali closed-class words the dictionary lacks or tags loosely (2026-10-21): the numeral one with its classifiers
 * and the question particle কি. */
import { makeClosedStage } from '../romance.js';

export const closedStage = makeClosedStage({
  একটি: [{ lemma: 'এক', pos: 'num', case: 'nom', number: 'sg' }], একটা: [{ lemma: 'এক', pos: 'num', case: 'nom', number: 'sg' }],
  কি: [{ lemma: 'কি', pos: 'particle' }],
});
