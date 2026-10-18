/* Arabic prepositions govern the genitive (Wright, Grammar of the Arabic Language II §§ 2–3), keyed by the bare
 * letters like the tokens. The inseparable ones (ب ل ك) are split off by splitWords. */
import { stripAr, lettersOf } from './normalize.js';

const ALL = ['في', 'من', 'إلى', 'على', 'عن', 'ب', 'ل', 'ك', 'مع', 'عند', 'بين', 'حتى', 'منذ', 'تحت', 'فوق', 'أمام', 'خلف', 'وراء',
  'بعد', 'قبل', 'حول', 'دون', 'عبر', 'ضد', 'نحو', 'لدى', 'خلال', 'مثل', 'بدون', 'حسب', 'داخل', 'خارج', 'عدا'];
// keyed by the letters as written and by the folded letters, so إلى and الى both find it
export const GOVERNMENT = Object.fromEntries(ALL.flatMap((p) => [[lettersOf(p), ['gen']], [stripAr(p), ['gen']]]));
