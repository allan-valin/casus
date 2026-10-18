/* German prepositions and the cases they govern (docs/languages/de.md §6), contractions included;
 * the same table as tools/casus_build/de/prepositions.py. */
const of = (list, cases) => Object.fromEntries(list.map((p) => [p, cases]));
export const GOVERNMENT = {
  ...of(['durch', 'für', 'gegen', 'ohne', 'um', 'bis', 'entlang'], ['acc']),
  ...of(['aus', 'bei', 'mit', 'nach', 'seit', 'von', 'zu', 'gegenüber', 'außer', 'ab'], ['dat']),
  ...of(['wegen', 'trotz', 'während', 'statt', 'anstatt', 'innerhalb', 'außerhalb', 'aufgrund'], ['gen']),
  laut: ['gen', 'dat'],
  ...of(['an', 'auf', 'hinter', 'in', 'neben', 'über', 'unter', 'vor', 'zwischen'], ['acc', 'dat']),
  ...of(['am', 'im', 'beim', 'vom', 'zum', 'zur', 'hinterm', 'überm', 'unterm', 'vorm'], ['dat']),
  ...of(['ans', 'ins', 'aufs', 'durchs', 'fürs', 'ums', 'übers', 'unters', 'vors', 'hinters'], ['acc']),
};
