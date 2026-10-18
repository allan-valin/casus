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
const RELATIVES = new Set(['der', 'die', 'das', 'dem', 'den', 'deren', 'dessen', 'denen', 'welcher', 'welche', 'welches', 'welchem', 'welchen']);
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
    // CL4: a Nebensatz ends with its finite verb
    const firstKey = out[members[0]].token.key.toLowerCase();
    const nebensatz = SUBORDINATORS.has(firstKey) || ((out[members[0]].token.clause ?? 0) > 0 && RELATIVES.has(firstKey));
    if (nebensatz && members.length > 1) {
      const lastB = out[last0];
      if (!lastB.pinned && lastB.candidates.some((c) => isFinite(c.analysis)) && lastB.candidates.some((c) => c.analysis.pos === 'verb' && NONFINITE.has(c.analysis.mood))) {
        out[last0] = { ...lastB, candidates: lastB.candidates.filter((c) => !(c.analysis.pos === 'verb' && NONFINITE.has(c.analysis.mood))).map((c) => withReason(c, 'clause: a subordinate clause ends with its finite verb')) };
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
    if (verbish.length === 1 && ((out[members[0]].token.clause ?? 0) === 0 || hasSubject) && !members.some((i) => out[i].token.key.toLowerCase() === 'zu')) {
      const b = out[verbish[0]];
      const keep = b.candidates.filter((c) => !(c.analysis.pos === 'verb' && NONFINITE.has(c.analysis.mood)));
      if (!b.pinned && keep.some((c) => isFinite(c.analysis)) && keep.length < b.candidates.length) {
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
