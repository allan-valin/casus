/*
 * A case language from its list of cases (overnight 2026-10-19: Finnish, Czech, Polish, Turkish, Hungarian, Icelandic,
 * Modern Greek). More cases than the six hues share a hue with a border style of their own (the spec's folding: Finnish
 * inner local cases share a hue, so do the outer ones), and every case keeps its own badge. The cascade is Russian's:
 * government, agreement inside the clause, the classical clause rules.
 */
import { governmentStage, agreementStage } from '../lib/disambiguate.js';
import { prepositionSettledStage, makeCoordinationStage, makeNumberStage, casedStage, makeOneSubjectStage, phraseAgreementStage, makeVocativeStage, properNameStage, nameArticleStage, makeConjunctionStage, makePersonStage, makeOneVerbStage, makeSubjectPersonStage } from '../lib/classical.js';
import { WORD_ORDERS } from '../app/lib/order.js';
import { segment } from './ru/segment.js';
import { tokenize } from './ru/tokenize.js';

function layoutPairs(json) {
  const LAYOUT = {};
  for (const [pos, names] of Object.entries(json.LAYOUT)) LAYOUT[pos] = names.map((n) => [n, json.TABLES[n]]);
  return { POS: json.POS, LAYOUT, json };
}

export function makeCaseLanguage({ code, name, inText, bcp47, wiktionary, cases, hues, shares = {}, borders = {}, government = {}, and = [], copulas = [], codes, voice, romanize = null, game = null, eras, script = {}, extraStages = [], preStages = [], address = [], pronounPerson = {}, splitWords = null, tokenize: ownTokenize = null, segment: ownSegment = null }) {
  const inventory = {
    primary: 'case',
    channels: {
      case: {
        values: cases.map((c) => c.id),
        hueOrder: hues,
        sharesHueOf: shares,
        border: borders,
        badge: Object.fromEntries(cases.map((c) => [c.id, c.badge])),
        name: { en: Object.fromEntries(cases.map((c) => [c.id, c.en])), pt: Object.fromEntries(cases.map((c) => [c.id, c.pt])) },
      },
      number: { values: ['sg', 'du', 'pl'], border: { pl: 'dashed', du: 'double' }, name: { en: { sg: 'singular', du: 'dual', pl: 'plural' }, pt: { sg: 'singular', du: 'dual', pl: 'plural' } } },
      gender: { values: ['m', 'f', 'n'], name: { en: { m: 'masculine', f: 'feminine', n: 'neuter' }, pt: { m: 'masculino', f: 'feminino', n: 'neutro' } } },
    },
    families: { nominal: ['noun', 'adj', 'pron', 'det', 'num'], verb: ['verb'], function: '*' },
    agreement: { targets: ['adj', 'det'], witnesses: ['noun', 'pron'] },
    codes: layoutPairs(codes),
  };
  const gov = (blocks) => governmentStage(blocks, government);
  const agr = (blocks) => agreementStage(blocks, inventory);
  const lower = (f) => f.toLowerCase();
  return {
    code, name, inText, bcp47, wiktionary,
    sources: { en: 'Wiktionary', pt: 'Wikcionário', full: { en: 'the English Wiktionary', pt: 'o Wiktionary em inglês' } },
    // script: a language's own key folding (Modern Greek accents, Sanskrit…) over the plain lower case
    script: { normalize: (s) => s.normalize('NFC'), rtl: false, spaced: true, prefixOf: lower, ...(romanize ? { romanize } : {}), ...script },
    inventory,
    segment: ownSegment ?? segment,
    tokenize: ownTokenize ?? tokenize,
    ...(splitWords ? { splitWords } : {}),
    // a vocative only where someone is addressed (the classical rule), when the language has one
    stages: [...preStages, properNameStage, makeConjunctionStage(and), nameArticleStage, casedStage, gov, phraseAgreementStage, agr, gov, prepositionSettledStage, makeVocativeStage(address), makeCoordinationStage(and), makeNumberStage({ conjunctions: and }),
      makeOneSubjectStage({ conjunctions: and, copulas }), makePersonStage(copulas), makeSubjectPersonStage(pronounPerson), makeOneVerbStage(and), gov, phraseAgreementStage, agr, gov, ...extraStages],
    government,
    arrange: WORD_ORDERS,
    eras: eras ?? [{ id: 'modern', label: `Present-day standard ${name.en}`, authors: '', ages: [], ipa: [] }],
    dataPath: `/data/${code}`,
    samplesPath: `/samples/${code}`,
    voice,
    ...(game ? { game } : {}),
  };
}
