/*
 * Sentence-context rules for German clauses (Allan, 2026-10-18: "it must use context from the sentence").
 * Clauses are the comma-separated stretches, except that a relative clause (opening with der/die/das/dessen/
 * deren/welch-) is cut out of the clause around it: "Die Frau, deren Sohn schläft, lacht" is one main clause
 * Die Frau … lacht and one relative clause deren Sohn schläft.
 * SUBJ   A clause with a finite verb has a subject: when no head is certainly nominative and exactly one could
 *        be, that one is; when several could, the first is (word order: subject first unless case shows otherwise). Skipped with copulas (CL11 handles them), coordination and comparisons.
 * CL10   Verb valency (data/de/valency.json, lemma -> object cases): a head that is not the subject, not under
 *        a preposition and not a time phrase keeps only the cases the verb takes (plus the genitive right after a
 *        noun, which is an attribute). The participle or infinitive of the clause speaks for it, not the auxiliary.
 * INTERJ An interjection reading needs to stand alone: first in its clause, or the whole clause.
 * Every rule narrows, never empties; the phrase stage carries a head's case to its article and adjectives.
 */
const RELATIVE_OPENERS = /^(der|die|das|dem|den|deren|dessen|denen|welche[rsmn]?)$/i;
const COPULA_LEMMAS = new Set(['sein', 'werden', 'bleiben', 'heißen', 'scheinen']);
const COPULA_FORMS = new Set(['bin', 'bist', 'ist', 'sind', 'seid', 'war', 'warst', 'waren', 'wart', 'sei', 'wäre', 'wären', 'werde', 'wirst', 'wird', 'werden', 'werdet', 'wurde', 'wurden', 'bleibt', 'blieb', 'bleiben', 'blieben', 'heißt', 'hieß', 'scheint', 'schien']);
const BREAKERS = new Set(['und', 'oder', 'sowie', 'als', 'wie', 'aber', 'sondern', 'noch', 'weder', 'sowohl']);
const TIME = /^(tag|tage|abend|morgen|nacht|woche|monat|jahr|jahre|stunde|stunden|minute|minuten|mal|zeit|winter|sommer|herbst|frühling|sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag)$/i;
// a quantity noun runs into the noun it counts: 105 Millionen Menschen, ein Glas Wasser
const MEASURE = /^(million(en)?|milliarde(n)?|tausende?|hunderte?|dutzende?|paar|glas|gläser|tasse(n)?|liter|kilo|meter|stück|flasche(n)?|reihe|menge|gruppe|zahl|anzahl|teil)$/i;
const FINITE = new Set(['ind', 'sub1', 'sub2']);
const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });
const isNounish = (c) => (c.analysis.pos === 'noun' || c.analysis.pos === 'pron') && c.analysis.case && c.analysis.case !== 'x';
const governed = (b) => b.candidates.some((c) => (c.links ?? []).some((l) => l.kind === 'government'));

/** index arrays, one per clause, relative clauses cut out of the clause around them */
export function clauseGroups(blocks) {
  const raw = new Map();
  blocks.forEach((b, i) => { const k = b.token.clause ?? 0; if (!raw.has(k)) raw.set(k, []); raw.get(k).push(i); });
  const keys = [...raw.keys()].sort((a, b) => a - b);
  const groups = [];
  const open = [];              // stack of main-clause groups interrupted by a relative clause
  for (const k of keys) {
    const members = raw.get(k);
    const first = blocks[members[0]];
    if (k > 0 && RELATIVE_OPENERS.test(first.token.surface) && groups.length) {
      open.push(groups[groups.length - 1]);
      groups.push(members);
    } else if (open.length && blocks[members[0]].candidates.length && blocks[members[0]].candidates.every((c) => c.analysis.pos === 'verb')) {
      // a clause after a relative clause that opens with the verb carries on the interrupted one (…, lacht)
      const host = open.pop();
      host.push(...members);
    } else groups.push(members);
  }
  return groups;
}

function narrow(out, i, keepFn, reason) {
  const b = out[i];
  if (b.pinned) return;
  const keep = b.candidates.filter(keepFn);
  if (keep.length && keep.length < b.candidates.length) out[i] = { ...b, candidates: keep.map((c) => withReason(c, reason)) };
}

export function subjectStage(blocks, ctx) {
  const out = blocks.slice();
  const valency = ctx?.valency ?? null;
  out.forEach((b, i) => {
    if (b.candidates.some((c) => c.analysis.pos === 'pron' && c.analysis.case && c.analysis.case !== 'x'))
      narrow(out, i, (c) => !(c.analysis.pos === 'pron' && (!c.analysis.case || c.analysis.case === 'x')), 'a pronoun: its readings with case');
  });
  for (const group of clauseGroups(out)) {
    // INTERJ
    group.forEach((i, at) => {
      if (at > 0 && group.length > 1 && out[i].candidates.some((c) => c.analysis.pos === 'interj')) narrow(out, i, (c) => c.analysis.pos !== 'interj', 'inside a clause, so not an interjection');
    });
    const finite = group.filter((i) => out[i].candidates.length && out[i].candidates.every((c) => c.analysis.pos === 'verb' && (FINITE.has(c.analysis.mood) || c.analysis.mood === 'imp')) && out[i].candidates.some((c) => FINITE.has(c.analysis.mood)));
    if (finite.length !== 1) continue;
    const verb = out[finite[0]];
    if (group.slice(1).some((i) => BREAKERS.has(out[i].token.key.toLowerCase()))) continue;   // als/wie opening the clause is a subordinator
    const copula = COPULA_FORMS.has(verb.token.key.toLowerCase()) || verb.candidates.some((c) => COPULA_LEMMAS.has(String(c.analysis.lemma)));
    // heads: noun or pronoun blocks not followed directly by a noun (an article word is not a head)
    const heads = group.filter((i) => {
      if (!out[i].candidates.some(isNounish) || governed(out[i])) return false;
      const next = out[i + 1];
      const detLike = out[i].candidates.every((c) => ['det', 'adj', 'num'].includes(c.analysis.pos) || (c.analysis.pos === 'pron' && !c.analysis.case));
      if (detLike && next && group.includes(i + 1) && next.candidates.some((c) => c.analysis.pos === 'noun')) return false;
      return !nameRun(i);
    });
    // a run of capitalised nouns with no article before it is one name (Gregor Samsa): its last word is the head
    function nameRun(i) {
      const next = out[i + 1];
      const prev = out[i - 1];
      const bare = !prev || !group.includes(i - 1) || (out[i].token.index - prev.token.index === 1 && !prev.candidates.some((c) => ['det', 'adj', 'num'].includes(c.analysis.pos)));   // a number between counts
      return (bare || MEASURE.test(out[i].token.key)) && next && group.includes(i + 1) && next.token.index - out[i].token.index === 1 && /^\p{Lu}/u.test(next.token.surface)
        && out[i].candidates.every((c) => c.analysis.pos === 'noun') && next.candidates.length && next.candidates.every((c) => c.analysis.pos === 'noun');
    }
    const nomOf = (i) => out[i].candidates.filter(isNounish).some((c) => c.analysis.case === 'nom');
    const certain = heads.filter((i) => { const n = out[i].candidates.filter(isNounish); return n.length && n.every((c) => c.analysis.case === 'nom'); });
    if (!copula) {
      // SUBJ
      const possible = heads.filter(nomOf);
      if (!certain.length && possible.length === 1) {
        narrow(out, possible[0], (c) => !isNounish(c) || c.analysis.case === 'nom', `subject: the only word that can be the subject of ${verb.token.surface}`);
      } else if (!certain.length && possible.length > 1) {
        // word order (Allan, 2026-10-18): German is subject-first when case cannot tell; OVS needs case to show it
        const first = Math.min(...possible);
        narrow(out, first, (c) => !isNounish(c) || c.analysis.case === 'nom', `word order: case cannot tell the subject apart, so the first candidate, ${out[first].token.surface}, is the subject of ${verb.token.surface}`);
        for (const i of possible) if (i !== first) narrow(out, i, (c) => !isNounish(c) || c.analysis.case !== 'nom', `word order: ${out[first].token.surface} comes first, so it is the subject of ${verb.token.surface}`);
      } else if (certain.length === 1) {
        for (const i of heads) if (i !== certain[0]) narrow(out, i, (c) => !isNounish(c) || c.analysis.case !== 'nom', `subject: ${out[certain[0]].token.surface} is already the subject of ${verb.token.surface}`);
      }
    }
    for (const i of group) {
      if (!nameRun(i)) continue;
      let h = i + 1;
      while (nameRun(h)) h += 1;
      const cases = new Set(out[h].candidates.map((c) => c.analysis.case));
      narrow(out, i, (c) => cases.has(c.analysis.case), `one phrase with ${out[h].token.surface}`);
    }
    // CL10
    if (!valency || copula) continue;
    const nonfinite = group.filter((i) => out[i].candidates.length && out[i].candidates.every((c) => c.analysis.pos === 'verb' && ['ppl2', 'inf'].includes(c.analysis.mood)));
    const speaker = nonfinite.length === 1 ? out[nonfinite[0]] : nonfinite.length ? null : verb;
    if (!speaker) continue;
    const lemmas = [...new Set(speaker.candidates.map((c) => String(c.analysis.lemma)))];
    if (lemmas.length !== 1 || !valency[lemmas[0]]) continue;
    const takes = new Set(valency[lemmas[0]]);
    for (const i of heads) {
      if (TIME.test(out[i].token.key)) continue;
      let j = i - 1;
      while (j >= 0 && group.includes(j) && out[j].candidates.length && out[j].candidates.every((c) => ['det', 'adj', 'num'].includes(c.analysis.pos))) j -= 1;
      const afterNoun = j >= 0 && group.includes(j) && out[j].candidates.some((c) => c.analysis.pos === 'noun');
      const keepFn = (c) => !isNounish(c) || c.analysis.case === 'nom' || takes.has(c.analysis.case) || (afterNoun && c.analysis.case === 'gen');
      // NP6: when only the genitive after a noun survives, that noun explains it, not the verb
      const kept = out[i].candidates.filter(keepFn).filter(isNounish);
      const owner = afterNoun && kept.length && kept.every((c) => c.analysis.case === 'gen') && !takes.has('gen') ? out[j].token.surface : null;
      narrow(out, i, keepFn, owner ? `genitive: right after ${owner}, it belongs to ${owner}`
        : `valency: ${speaker.token.surface} takes ${[...takes].map((x) => ({ acc: 'an accusative', dat: 'a dative', gen: 'a genitive' }[x])).join(' and ')}`);
    }
  }
  return out;
}
