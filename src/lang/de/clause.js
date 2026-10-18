/*
 * German clause rules (docs/languages/de.md §10). Clauses are the stretches between , ; : – ( ) (the tokenizer
 * numbers them as token.clause).
 * CL2  A finite verb in the 1st or 2nd person needs its subject in the clause (ich, wir, du, ihr; German
 *      drops no subject pronouns): with none of them, the finite readings are 3rd person.
 *      An imperative stands first in its clause.
 * CL3  A clause has one finite verb. Once it is certain, a clause-final word that can be an infinitive or a
 *      participle is one (the right bracket of the Satzklammer: … fand er sich verwandelt).
 * CL4  Nebensatz (after a subordinating conjunction, or a relative pronoun opening a later clause): the finite
 *      verb is the last word; the verbs before it are not finite (dass er kommen will).
 * CL7  One certain nominative subject and no und/oder: the finite verb takes its number.
 * CL8  zu right before the clause-final infinitive is the infinitive marker, not a preposition.
 */
const SUBORDINATORS = new Set(['als', 'dass', 'weil', 'wenn', 'ob', 'obwohl', 'obgleich', 'damit', 'nachdem', 'bevor', 'ehe',
  'während', 'da', 'falls', 'sodass', 'seit', 'seitdem', 'bis', 'indem', 'sobald', 'solange', 'sooft', 'wie', 'wo', 'wohin', 'woher', 'warum', 'wer', 'was']);
const COPULAS = new Set(['bin', 'bist', 'ist', 'sind', 'seid', 'war', 'warst', 'waren', 'wart', 'sei', 'wäre', 'wären', 'werde', 'wirst', 'wird', 'werden', 'werdet', 'wurde', 'wurden', 'bleibe', 'bleibst', 'bleibt', 'bleiben', 'blieb', 'blieben', 'heiße', 'heißt', 'heißen', 'hieß', 'scheint', 'scheinen', 'schien', 'sein', 'gewesen', 'geworden', 'geblieben']);
const POSTPOSITIONS = new Set(['entlang', 'gegenüber', 'zufolge', 'nach', 'wegen', 'halber', 'zuliebe', 'willen', 'hindurch', 'über']);
const SUBJECT_PRONOUNS = { ich: ['1', 'sg'], du: ['2', 'sg'], wir: ['1', 'pl'] };
const NOMINAL = new Set(['noun', 'pron', 'det', 'adj', 'num']);
const RELATIVES = new Set(['der', 'die', 'das', 'dem', 'den', 'deren', 'dessen', 'denen', 'welcher', 'welche', 'welches', 'welchem', 'welchen']);
import { DET_LIKE } from './phrase.js';

const FIRST_SECOND = new Set(['ich', 'mich', 'mir', 'wir', 'uns', 'du', 'dich', 'dir', 'ihr', 'euch']);
const FINITE = new Set(['ind', 'sub1', 'sub2', 'imp']);
const NONFINITE = new Set(['inf', 'ppl1', 'ppl2']);
const isFinite = (a) => a.pos === 'verb' && FINITE.has(a.mood) && a.person !== '0';
const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });

export function clauseStage(blocks) {
  const out = blocks.slice();
  const clauses = new Map();
  out.forEach((b, i) => { const k = b.token.clause ?? 0; if (!clauses.has(k)) clauses.set(k, []); clauses.get(k).push(i); });
  for (const members of clauses.values()) {
    const has12 = members.some((i) => FIRST_SECOND.has(out[i].token.key.toLowerCase()));
    // the subject's person: ich/wir → 1, du → 2, a nominative noun or 3rd-person pronoun → 3 (ihr is 2pl or 'her')
    const persons = new Set();
    for (const i of members) {
      const k = out[i].token.key.toLowerCase();
      if (k === 'ich' || k === 'wir') persons.add('1');
      else if (k === 'du') persons.add('2');
      else if (k === 'ihr') { persons.add('2'); persons.add('3'); }
      else if (out[i].candidates.some((c) => (c.analysis.pos === 'noun' || c.analysis.pos === 'pron') && c.analysis.case === 'nom')) persons.add('3');
    }
    members.forEach((i, pos) => {
      const b = out[i];
      if (!b.candidates.some((c) => isFinite(c.analysis)) || b.pinned) return;
      const keep = b.candidates.filter((c) => {
        const a = c.analysis;
        if (!isFinite(a)) return true;
        if (a.mood === 'imp') return pos === 0;
        if (!has12) return a.person === '3';
        return persons.size === 0 || persons.has(a.person);
      });
      if (keep.length && keep.length < b.candidates.length) {
        const r = has12 ? `clause: the subject here is ${[...persons].map((p) => `${p}${p === '1' ? 'st' : p === '2' ? 'nd' : 'rd'} person`).join(' or ')}` : 'clause: no ich/wir/du/ihr in this clause, so a finite verb here is 3rd person';
        out[i] = { ...b, candidates: keep.map((c) => (isFinite(c.analysis) ? withReason(c, r) : c)) };
      }
    });
    const last0 = members[members.length - 1];
    // CL8: zu + clause-final infinitive
    for (let k = 0; k + 1 < members.length; k += 1) {
      const z = out[members[k]];
      const v = out[members[k + 1]];
      if (z.token.key.toLowerCase() !== 'zu' || members[k + 1] !== last0 || z.pinned) continue;
      if (!v.candidates.some((c) => c.analysis.mood === 'inf')) continue;
      const others = z.candidates.some((c) => c.analysis.pos === 'particle') ? z.candidates.filter((c) => c.analysis.pos === 'particle') : z.candidates.filter((c) => c.analysis.pos !== 'prep');
      if (others.length && others.length < z.candidates.length) out[members[k]] = { ...z, candidates: others.map((c) => withReason(c, 'clause: zu before the infinitive that ends the clause')) };
      if (!v.pinned) out[last0] = { ...v, candidates: v.candidates.filter((c) => c.analysis.mood === 'inf').map((c) => withReason(c, 'clause: infinitive with zu at the end of the clause')) };
    }
    const sentenceStart = (out[members[0]].token.clause ?? 0) === 0 && members[0] === 0;
    // C5 / NP0: a capitalised first word whose small-letter form is a pronoun, adverb, conjunction or
    // preposition is not the noun (Ich, not das Ich; Hier, not das Hier) — the noun would need its article
    if (sentenceStart) {
      const b = out[members[0]];
      if (b.token.altKey !== undefined || /^\p{Lu}/u.test(b.token.surface)) {
        const nonNoun = b.candidates.filter((c) => ['pron', 'adv', 'conj', 'prep', 'det', 'particle'].includes(c.analysis.pos));
        if (!b.pinned && nonNoun.length && b.candidates.some((c) => c.analysis.pos === 'noun')) {
          out[members[0]] = { ...b, candidates: b.candidates.filter((c) => c.analysis.pos !== 'noun').map((c) => withReason(c, 'sentence start: a noun here would need its article')) };
        }
      }
    }
    // CL4: a Nebensatz ends with its finite verb
    const firstKey = out[members[0]].token.key.toLowerCase();
    // CL4a: a subordinating conjunction opening its clause is the conjunction (Als, not a noun)
    if (SUBORDINATORS.has(firstKey) && !['wie', 'wo', 'wer', 'was', 'da', 'bis', 'seit', 'während'].includes(firstKey)) {
      const b = out[members[0]];
      const conj = b.candidates.filter((c) => c.analysis.pos === 'conj');
      if (!b.pinned && conj.length && conj.length < b.candidates.length) out[members[0]] = { ...b, candidates: conj.map((c) => withReason(c, 'clause: a subordinating conjunction opens this clause')) };
    }
    const nebensatz = SUBORDINATORS.has(firstKey) || ((out[members[0]].token.clause ?? 0) > 0 && RELATIVES.has(firstKey));
    if (nebensatz && members.length > 1) {
      const lastB = out[last0];
      if (!lastB.pinned && lastB.candidates.some((c) => isFinite(c.analysis)) && lastB.candidates.some((c) => !isFinite(c.analysis))) {
        out[last0] = { ...lastB, candidates: lastB.candidates.filter((c) => isFinite(c.analysis)).map((c) => withReason(c, 'clause: a subordinate clause ends with its finite verb')) };
      }
      if (out[last0].candidates.length && out[last0].candidates.every((c) => isFinite(c.analysis))) {
        for (const i of members.slice(1, -1)) {
          const b = out[i];
          if (b.pinned || !b.candidates.some((c) => isFinite(c.analysis))) continue;
          const keep = b.candidates.filter((c) => !isFinite(c.analysis));
          if (keep.length) out[i] = { ...b, candidates: keep.map((c) => withReason(c, `clause: ${out[last0].token.surface} is this subordinate clause's finite verb`)) };
        }
      }
    }
    // CL5a: a clause with a certain nominative subject, or the sentence's first clause, needs a finite verb;
    // when only one word in it can be a verb, that word is finite (Die Kinder spielen)
    const verbish = members.filter((i) => out[i].candidates.some((c) => c.analysis.pos === 'verb'));
    const hasSubject = members.some((i) => out[i].candidates.length && out[i].candidates.every((c) => (c.analysis.pos === 'noun' || c.analysis.pos === 'pron') && c.analysis.case === 'nom'));
    // only zu right before a clause-final infinitive makes an infinitive group (not zu Hause)
    const zuInfinitive = members.length > 1 && out[members[members.length - 2]].token.key.toLowerCase() === 'zu'
      && out[last0].candidates.some((c) => c.analysis.mood === 'inf');
    if (verbish.length === 1 && ((out[members[0]].token.clause ?? 0) === 0 || hasSubject) && !zuInfinitive) {
      const b = out[verbish[0]];
      const keep = b.candidates.filter((c) => isFinite(c.analysis));
      if (!b.pinned && keep.length && keep.length < b.candidates.length) {
        out[verbish[0]] = { ...b, candidates: keep.map((c) => withReason(c, 'clause: the only verb of the clause is its finite verb')) };
      }
    }
    // CL7: one certain nominative subject → the verb's number
    if (!members.some((i) => ['und', 'oder', 'sowie'].includes(out[i].token.key.toLowerCase()))) {
      const subjects = members.filter((i) => {
        const cs = out[i].candidates;
        return cs.length && cs.every((c) => (c.analysis.pos === 'noun' || c.analysis.pos === 'pron') && c.analysis.case === 'nom');
      });
      const numbers = new Set(subjects.map((i) => out[i].candidates[0].analysis.number));
      if (subjects.length === 1 && numbers.size === 1 && ['sg', 'pl'].includes([...numbers][0])) {
        const n = [...numbers][0];
        for (const i of members) {
          const b = out[i];
          if (b.pinned || !b.candidates.some((c) => isFinite(c.analysis))) continue;
          const keep = b.candidates.filter((c) => !isFinite(c.analysis) || c.analysis.number === n);
          if (keep.length && keep.length < b.candidates.length) out[i] = { ...b, candidates: keep.map((c) => (isFinite(c.analysis) ? withReason(c, `clause: the subject ${out[subjects[0]].token.surface} is ${n === 'sg' ? 'singular' : 'plural'}`) : c)) };
        }
      }
    }
    const noUnd = !members.some((i) => ['und', 'oder', 'sowie'].includes(out[i].token.key.toLowerCase()));
    // C4a: an unambiguous ich/du/wir fixes the finite verb's person and number
    const fixed = noUnd ? members.map((i) => SUBJECT_PRONOUNS[out[i].token.key.toLowerCase()]).filter(Boolean) : [];
    if (fixed.length === 1) {
      const [p, n] = fixed[0];
      for (const i of members) {
        const b = out[i];
        if (b.pinned || !b.candidates.some((c) => isFinite(c.analysis))) continue;
        const keep = b.candidates.filter((c) => !isFinite(c.analysis) || c.analysis.mood === 'imp' || (c.analysis.person === p && c.analysis.number === n));
        if (keep.length && keep.length < b.candidates.length) out[i] = { ...b, candidates: keep.map((c) => (isFinite(c.analysis) ? withReason(c, `clause: the subject is ${out[members.find((k) => SUBJECT_PRONOUNS[out[k].token.key.toLowerCase()])].token.surface}`) : c)) };
      }
    }
    const finiteVerb = members.find((i) => out[i].candidates.length && out[i].candidates.every((c) => isFinite(c.analysis)));
    const copula = members.some((i) => COPULAS.has(out[i].token.key.toLowerCase()));
    const hasNom = (i) => out[i].candidates.some((c) => NOMINAL.has(c.analysis.pos) && c.analysis.case === 'nom');
    // D2: sie/Sie/ihr as the only possible subject takes the verb's person and number
    if (finiteVerb !== undefined && noUnd) {
      const vs = out[finiteVerb].candidates.map((c) => `${c.analysis.person}${c.analysis.number}`);
      const sie = members.filter((i) => ['sie', 'ihr'].includes(out[i].token.key.toLowerCase()) && hasNom(i));
      const otherNom = members.filter((i) => hasNom(i) && !sie.includes(i));
      if (sie.length === 1 && !otherNom.length && new Set(vs).size === 1) {
        const [p, n] = [vs[0][0], vs[0].slice(1)];
        const b = out[sie[0]];
        const keep = b.candidates.filter((c) => c.analysis.pos === 'pron' && c.analysis.case === 'nom' && c.analysis.number === n
          && (b.token.key.toLowerCase() !== 'ihr' || p === '2'));
        if (!b.pinned && keep.length && keep.length < b.candidates.length) out[sie[0]] = { ...b, candidates: keep.map((c) => withReason(c, `clause: the subject of ${out[finiteVerb].token.surface} (${p}${n})`)) };
      }
    }
    // D1: one nominative per clause — once the subject is certain, the other phrases are not nominative
    // (the predicate of sein, werden, bleiben, heißen is the exception)
    if (!copula && noUnd) {
      const subject = members.find((i) => {
        const cs = out[i].candidates;
        return (cs.length && cs.every((c) => (c.analysis.pos === 'pron' || c.analysis.pos === 'noun') && c.analysis.case === 'nom'))
          || ['ich', 'du', 'wir', 'er'].includes(out[i].token.key.toLowerCase());
      });
      if (subject !== undefined) {
        for (const i of members) {
          if (i === subject) continue;
          const b = out[i];
          if (b.pinned || !hasNom(i)) continue;
          const keep = b.candidates.filter((c) => !(NOMINAL.has(c.analysis.pos) && c.analysis.case === 'nom'));
          if (keep.length && keep.some((c) => NOMINAL.has(c.analysis.pos) && c.analysis.case && c.analysis.case !== 'x')) {
            out[i] = { ...b, candidates: keep.map((c) => withReason(c, `clause: ${out[subject].token.surface} is the subject, so this is not nominative`)) };
          }
        }
      }
    }
    // D3 / REL1: a relative pronoun takes gender and number from its antecedent
    const rel = out[members[0]];
    if ((rel.token.clause ?? 0) > 0 && RELATIVES.has(rel.token.key.toLowerCase()) && members[0] > 0 && !rel.pinned) {
      const ante = out[members[0] - 1];
      const nouns = ante.candidates.filter((c) => c.analysis.pos === 'noun' && c.analysis.case && c.analysis.case !== 'x');
      if (nouns.length) {
        const gn = new Set(nouns.map((c) => `${c.analysis.number}|${c.analysis.number === 'pl' ? 'x' : c.analysis.gender}`));
        const keep = rel.candidates.filter((c) => !c.analysis.case || c.analysis.case === 'x'
          || gn.has(`${c.analysis.number}|${c.analysis.number === 'pl' ? 'x' : c.analysis.gender}`)
          || (c.analysis.gender === 'x' && [...gn].some((k) => k.startsWith(`${c.analysis.number}|`))));
        if (keep.length && keep.length < rel.candidates.length) out[members[0]] = { ...rel, candidates: keep.map((c) => withReason(c, `relative clause: agrees with ${ante.token.surface}`)) };
      }
      // D4: an article word followed by something that cannot continue a noun phrase is the pronoun
      const nxt = out[members[1]];
      const r2 = out[members[0]];
      if (nxt && !nxt.candidates.some((c) => ['det', 'adj', 'num', 'noun'].includes(c.analysis.pos)) && r2.candidates.some((c) => c.analysis.pos === 'pron')) {
        const keep2 = r2.candidates.filter((c) => c.analysis.pos !== 'det' || !c.analysis.case || c.analysis.case === 'x');
        if (keep2.length < r2.candidates.length) out[members[0]] = { ...r2, candidates: keep2.map((c) => withReason(c, `relative clause: ${nxt.token.surface} cannot follow an article, so this is the pronoun`)) };
      }
    }
    // B3 / CL6a: a clause-final word with nothing after it to govern is not a preposition (ruft … an)
    {
      const b = out[last0];
      const preps = b.candidates.filter((c) => c.analysis.pos === 'prep');
      if (!b.pinned && preps.length && preps.length < b.candidates.length && !POSTPOSITIONS.has(b.token.key.toLowerCase()) && members.length > 1) {
        out[last0] = { ...b, candidates: b.candidates.filter((c) => c.analysis.pos !== 'prep').map((c) => withReason(c, 'clause: nothing follows to govern, so not a preposition (a separable particle)')) };
      }
    }
    // range: bis between two numbers is not a preposition
    for (const i of members) {
      const b = out[i];
      if (b.token.range && b.candidates.some((c) => c.analysis.pos === 'prep') && b.candidates.some((c) => c.analysis.pos !== 'prep')) {
        out[i] = { ...b, candidates: b.candidates.filter((c) => c.analysis.pos !== 'prep').map((c) => withReason(c, 'between two numbers: a range, not a preposition')) };
      }
    }
    // CL11: sein, werden, bleiben take no accusative: their ungoverned noun phrases are not accusative
    if (copula) {
      for (const i of members) {
        const b = out[i];
        if (b.pinned || b.candidates.some((c) => c.links?.some((l) => l.kind === 'government'))) continue;
        if (!b.candidates.some((c) => NOMINAL.has(c.analysis.pos) && c.analysis.case === 'nom')) continue;
        const keep = b.candidates.filter((c) => !(NOMINAL.has(c.analysis.pos) && c.analysis.case === 'acc'));
        if (keep.length < b.candidates.length) out[i] = { ...b, candidates: keep.map((c) => withReason(c, 'clause: sein/werden/bleiben take no accusative')) };
      }
    }
    // NP9: phrases joined by und/oder share their case
    for (let k = 1; k + 1 < members.length; k += 1) {
      if (!['und', 'oder', 'sowie', 'bzw'].includes(out[members[k]].token.key.toLowerCase())) continue;
      const left = out[members[k - 1]];
      const rightIdx = members.slice(k + 1).find((i) => out[i].candidates.some((c) => c.analysis.pos === 'noun'));
      if (rightIdx === undefined || !left.candidates.some((c) => c.analysis.pos === 'noun')) continue;
      const right = out[rightIdx];
      const cases = (b) => new Set(b.candidates.filter((c) => c.analysis.pos === 'noun').map((c) => c.analysis.case));
      const shared = [...cases(left)].filter((c) => cases(right).has(c));
      if (!shared.length) continue;
      for (const [i, b] of [[members[k - 1], left], [rightIdx, right]]) {
        if (b.pinned) continue;
        const keep = b.candidates.filter((c) => c.analysis.pos !== 'noun' || shared.includes(c.analysis.case));
        if (keep.length < b.candidates.length) out[i] = { ...b, candidates: keep.map((c) => withReason(c, `coordination: shares its case with ${(b === left ? right : left).token.surface}`)) };
      }
    }
    // CL3: the clause's finite verb is certain → the clause-final word is its non-finite partner
    const finite = members.find((i) => out[i].candidates.length && out[i].candidates.every((c) => isFinite(c.analysis)));
    const last = members[members.length - 1];
    if (finite !== undefined && last !== finite && !out[last].pinned) {
      const cs = out[last].candidates;
      if (cs.some((c) => c.analysis.pos === 'verb' && NONFINITE.has(c.analysis.mood)) && cs.some((c) => isFinite(c.analysis))) {
        const r = `clause: the finite verb is ${out[finite].token.surface}; the end of the clause holds its infinitive or participle`;
        out[last] = { ...out[last], candidates: cs.filter((c) => !isFinite(c.analysis)).map((c) => withReason(c, r)) };
      }
    }
  }
  return out;
}

/* REF (Allan, 2026-10-18): a 3rd-person personal pronoun points back to the nearest earlier noun of a
 * matching gender and number in the sentence (sie → die Großmutter). A link and a reason, never a narrowing:
 * the referent may be outside the sentence. */
const PERSONAL_3 = new Set(['er', 'ihn', 'ihm', 'sie', 'ihr', 'es', 'ihnen', 'seiner', 'ihrer']);
export function referenceStage(blocks) {
  return blocks.map((b, i) => {
    if (!PERSONAL_3.has(b.token.key.toLowerCase()) || i === 0 && b.token.key === 'Es') return b;
    const prons = b.candidates.filter((c) => c.analysis.pos === 'pron');
    if (!prons.length) return b;
    for (let j = i - 1; j >= 0; j -= 1) {
      const nouns = blocks[j].candidates.filter((c) => c.analysis.pos === 'noun');
      if (!nouns.length) continue;
      const match = nouns.some((n) => prons.some((p) => (p.analysis.number === 'pl' && n.analysis.number === 'pl')
        || (p.analysis.number === 'sg' && n.analysis.number === 'sg' && (p.analysis.gender === n.analysis.gender || p.analysis.gender === 'x'))));
      if (!match) continue;
      const r = `reference: refers to ${blocks[j].token.surface} (the nearest earlier noun of its gender and number)`;
      return { ...b, candidates: b.candidates.map((c) => (c.analysis.pos !== 'pron' || c.reasons.includes(r) ? c
        : { ...c, reasons: [...c.reasons, r], links: [...(c.links ?? []), { kind: 'reference', index: blocks[j].token.index }] })) };
    }
    return b;
  });
}

/* CL6 (separable verbs): the clause-final particle joins the clause's finite verb when the joined form exists
 * (ruft … an → anruft = anrufen): the verb takes the joined verb's readings of the same person and number and
 * both words are linked. Never applied when the joined form is unknown. */
export function separableStage(blocks, ctx) {
  const lookups = ctx?.lookups;
  if (!lookups) return blocks;
  const out = blocks.slice();
  const clauses = new Map();
  out.forEach((b, i) => { const k = b.token.clause ?? 0; if (!clauses.has(k)) clauses.set(k, []); clauses.get(k).push(i); });
  for (const members of clauses.values()) {
    const p = members[members.length - 1];
    const particle = out[p];
    if (!particle || particle.candidates.some((c) => c.analysis.pos === 'prep')) continue;     // still a preposition
    for (const i of members.slice(0, -1)) {
      const v = out[i];
      const joined = v.token.extraKeys?.map((k) => lookups.get(k) ?? []).flat() ?? [];
      if (!joined.length || !v.candidates.some((c) => isFinite(c.analysis))) continue;
      const keep = joined.filter((a) => a.pos === 'verb' && v.candidates.some((c) => isFinite(c.analysis) && c.analysis.person === a.person && c.analysis.number === a.number && c.analysis.mood === a.mood));
      if (!keep.length) continue;
      const r = `separable verb: ${v.token.surface} … ${particle.token.surface} (one verb)`;
      out[i] = { ...v, candidates: keep.map((a) => ({ analysis: a, reasons: ['lexicon: attested form', r], links: [{ kind: 'expression', index: particle.token.index, contiguous: false }] })) };
      const pc = particle.candidates.filter((c) => c.analysis.pos === 'adv' || c.analysis.pos === 'particle');
      out[p] = { ...particle, candidates: (pc.length ? pc : particle.candidates).map((c) => ({ ...c, reasons: [...c.reasons, r], links: [...(c.links ?? []), { kind: 'expression', index: v.token.index, contiguous: false }] })) };
      break;
    }
  }
  return out;
}
