/*
 * German clause rules (docs/languages/de.md §10). Clauses are the stretches between , ; : – ( ) (the tokenizer
 * numbers them as token.clause).
 * CL2  A finite verb in the 1st or 2nd person needs its subject in the clause (ich, wir, du, ihr; German
 *      drops no subject pronouns): with none of them, the finite readings are 3rd person.
 *      An imperative stands first in its clause.
 * CL3  A clause has one finite verb. Once it is certain, a clause-final word that can be an infinitive or a
 *      participle is one (the right bracket of the Satzklammer: … fand er sich verwandelt).
 */
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
