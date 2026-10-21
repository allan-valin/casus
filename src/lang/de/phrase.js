/*
 * German noun phrases (docs/languages/de.md §10; Allan on Kafka and the German-teacher review, 2026-10-18).
 * NP1  A phrase is (article word) (adjectives, participles, numerals, uninflected words)* noun, contiguous;
 *      every inflected member takes the noun's case, number and gender. A noun of unknown gender matches any.
 *      If a member shares no reading with the noun, the phrase hypothesis is wrong: nothing is narrowed.
 * NP2  The article word decides the adjective declension: der-words → weak, ein-words → mixed, none → strong;
 *      NP2a a contraction is an article with fixed case/number/gender (im = in dem → dat sg m/n, zur → dat sg f,
 *      ins → acc sg n).
 * NP3  Between an article word and its noun only member readings stay (einen: not the verb einen; das: not the
 *      conjunction); an article word is not a pronoun — dies-, jen-, kein-, welch-, all- count as article words.
 * NP12 A cardinal above one makes the phrase plural.
 * A der-word opening a later clause (after a comma) may be a relative pronoun: it is left out of the phrase.
 * Pure stage: never empties a block (narrow() guards too).
 */
const DER_WORDS = /^(der|die|das|dem|den|des|dies|jen|jed|welch|manch|solch|all|beide)/i;
const EIN_WORDS = /^(ein|kein|mein|dein|sein|ihr|unser|euer|eur)/i;
export const DET_LIKE = /^(dies|jen|jed|kein|welch|manch|solch|all|beid|mein|dein|sein|unser|euer|eur)/i;
const CONTRACTED = {
  dat_mn: ['am', 'im', 'beim', 'vom', 'zum', 'hinterm', 'überm', 'unterm', 'vorm'],
  dat_f: ['zur'],
  acc_n: ['ans', 'ins', 'aufs', 'durchs', 'fürs', 'ums', 'übers', 'unters', 'vors', 'hinters'],
};
const CONTRACTION_TRIPLES = Object.fromEntries([
  ...CONTRACTED.dat_mn.map((w) => [w, [['dat', 'sg', 'm'], ['dat', 'sg', 'n']]]),
  ...CONTRACTED.dat_f.map((w) => [w, [['dat', 'sg', 'f']]]),
  ...CONTRACTED.acc_n.map((w) => [w, [['acc', 'sg', 'n']]]),
]);
const CARDINALS = new Set(['zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'hundert', 'tausend', 'beide', 'beiden', 'viele', 'vielen', 'einige', 'einigen', 'mehrere', 'mehreren']);

const isMember = (c, block) => ['det', 'adj', 'num', 'ppl', 'vpar'].includes(c.analysis.pos)
  || (c.analysis.pos === 'pron' && DET_LIKE.test(block.token.surface));
const cased = (a) => a.case && a.case !== 'x';
const genderOk = (g1, g2, number) => number === 'pl' || !g1 || !g2 || g1 === 'x' || g2 === 'x' || g1 === g2;
const agrees = (a, t) => a.case === t[0] && a.number === t[1] && genderOk(a.gender, t[2], t[1]);

function blocksBefore(blocks, i) {
  const out = [];
  for (let j = i - 1; j >= 0 && out.length < 6; j -= 1) {
    if (blocks[j + 1].token.index - blocks[j].token.index !== 1) break;              // punctuation between
    const b = blocks[j];
    if (b.candidates.some((c) => c.analysis.pos === 'prep')) break;                  // NP4 comes first
    // a der-word opening a later clause may be a relative pronoun (Die Frau, die Kinder liebt)
    if ((b.token.clause ?? 0) > 0 && j > 0 && blocks[j - 1].token.clause !== b.token.clause && /^(der|die|das|dem|den|deren|dessen|denen)$/i.test(b.token.surface)
      && b.candidates.some((c) => c.analysis.pos === 'pron')) break;   // (not once CL8a has ruled the pronoun out)
    const member = b.candidates.some((c) => isMember(c, b));
    const uninflected = b.candidates.length > 0 && b.candidates.every((c) => !cased(c.analysis) && ['adv', 'adj', 'num', 'particle'].includes(c.analysis.pos));
    if (!member && !uninflected) break;
    out.unshift(j);
  }
  return out;
}

const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });
const withLink = (c, index) => (c.links?.some((l) => l.kind === 'agreement' && l.index === index) ? c : { ...c, links: [...(c.links ?? []), { kind: 'agreement', index }] });

export function phraseStage(blocks) {
  const out = blocks.slice();
  for (let i = 0; i < out.length; i += 1) {
    const head = out[i];
    const nouns = head.candidates.filter((c) => c.analysis.pos === 'noun' && cased(c.analysis));
    if (!nouns.length) continue;
    // the head of a run of nouns is the last one (der Deutschen Einheit: Einheit)
    const next = out[i + 1];
    if (next && next.token.index - head.token.index === 1 && next.candidates.some((c) => c.analysis.pos === 'noun') && head.candidates.some((c) => isMember(c, head))) continue;
    const members = blocksBefore(out, i);
    const before = out[(members[0] ?? i) - 1];
    const contraction = before && (out[members[0] ?? i].token.index - before.token.index === 1) ? CONTRACTION_TRIPLES[before.token.key.toLowerCase()] : null;
    const inflected = members.filter((j) => out[j].candidates.some((c) => isMember(c, out[j]) && cased(c.analysis)));
    const cardinal = members.some((j) => CARDINALS.has(out[j].token.key.toLowerCase()) || /^([2-9]|\d{2,})$/.test(out[j].token.key));
    if (!inflected.length && !contraction && !cardinal) continue;

    // NP1: the triples the noun and every inflected member allow
    let shared = nouns.map((c) => [c.analysis.case, c.analysis.number, c.analysis.gender]);
    const narrowBy = (triples) => {
      const kept = shared.filter((t) => triples.some((u) => u[0] === t[0] && u[1] === t[1] && genderOk(u[2], t[2], t[1])));
      return kept.length ? kept : null;
    };
    let ok = true;
    if (contraction) { const k = narrowBy(contraction); if (k) shared = k; else ok = false; }
    for (const j of inflected) {
      const own = out[j].candidates.filter((c) => isMember(c, out[j]) && cased(c.analysis)).map((c) => [c.analysis.case, c.analysis.number, c.analysis.gender]);
      const k = narrowBy(own);
      if (k) shared = k; else { ok = false; break; }                                  // A3: not one phrase
    }
    if (!ok) continue;
    // NP12: a cardinal above one makes the phrase plural
    if (cardinal) {
      const pl = shared.filter((t) => t[1] === 'pl');
      if (pl.length) shared = pl;
    }
    // NP2: the declension type the article word asks of the adjectives
    const det = members.map((j) => out[j]).find((b) => b.candidates.some((c) => c.analysis.pos === 'det' || (c.analysis.pos === 'pron' && DET_LIKE.test(b.token.surface))));
    const infl = det ? (DER_WORDS.test(det.token.surface) ? 'weak' : EIN_WORDS.test(det.token.surface) ? 'mixed' : null) : contraction ? 'weak' : 'strong';
    const reason = `agreement: in the phrase of ${head.token.surface}`;
    const fits = (a) => shared.some((t) => agrees(a, t));
    out[i] = {
      ...head,
      candidates: head.candidates.filter((c) => c.analysis.pos === 'noun' && cased(c.analysis) && fits(c.analysis)).map((c) => withReason(c, reason)),
    };
    for (const j of members) {
      const b = out[j];
      if (!b.candidates.some((c) => isMember(c, b) && cased(c.analysis))) continue;   // uninflected: carried as is
      const keep = b.candidates
        .filter((c) => isMember(c, b) && cased(c.analysis) && fits(c.analysis))
        .filter((c) => c.analysis.pos !== 'adj' || !infl || !c.analysis.infl || c.analysis.infl === 'x' || c.analysis.infl === infl)
        // a det-like pronoun reading stands in for the article only when the word has no article reading
        .filter((c) => c.analysis.pos !== 'pron' || (DET_LIKE.test(b.token.surface) && !b.candidates.some((o) => o.analysis.pos === 'det')));
      if (keep.length) out[j] = { ...b, candidates: keep.map((c) => withLink(withReason(c, reason), head.token.index)) };
    }
  }
  return out;
}
