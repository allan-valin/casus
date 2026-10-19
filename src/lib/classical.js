/*
 * Rules a Latin or Greek teacher applies to any sentence (Allan, 2026-10-18: "make them more sure").
 * Each narrows, never empties (narrow() guards), and is a stage(blocks, ctx).
 * PREP  A preposition whose object the government stage settled is the preposition: its interjection and
 *       caseless-noun readings (the letter a, an abbreviation) drop.
 * VOC   A vocative is direct address; a sentence with no 2nd-person verb, no imperative and no o / ὦ addresses
 *       no one, so it has no vocatives.
 * COORD Words joined by et / ac / atque / καί share their case.
 */
const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });

export function prepositionSettledStage(blocks) {
  return blocks.map((b) => {
    const governing = b.candidates.some((c) => c.analysis.pos === 'prep' && (c.links ?? []).some((l) => l.kind === 'government'));
    if (!governing || b.pinned) return b;
    const keep = b.candidates.filter((c) => !(c.analysis.pos === 'interj' || ((c.analysis.pos === 'noun' || c.analysis.pos === 'pron') && (!c.analysis.case || c.analysis.case === 'x'))));
    return keep.length && keep.length < b.candidates.length
      ? { ...b, candidates: keep.map((c) => withReason(c, 'government: it has taken its object, so it is the preposition')) } : b;
  });
}

export function makeVocativeStage(addressWords) {
  const address = new Set(addressWords);
  return function vocativeStage(blocks) {
    // only a word that is certainly a 2nd-person verb or an imperative makes the sentence an address
    const addressed = blocks.some((b) => address.has(b.token.key)
      || (b.candidates.length && b.candidates.every((c) => c.analysis.pos === 'verb' && (c.analysis.person === '2' || c.analysis.mood === 'imp'))));
    if (addressed) return blocks;
    return blocks.map((b) => {
      if (b.pinned || !b.candidates.some((c) => c.analysis.case === 'voc')) return b;
      const keep = b.candidates.filter((c) => c.analysis.case !== 'voc');
      return keep.length ? { ...b, candidates: keep.map((c) => withReason(c, 'no address in this sentence (no 2nd person, imperative or o), so no vocative')) } : b;
    });
  };
}

export function makeCoordinationStage(conjunctions) {
  const conj = new Set(conjunctions);
  return function coordinationStage(blocks) {
    const out = blocks.slice();
    const NOMINAL = new Set(['noun', 'adj', 'pron', 'num', 'vpar', 'det']);
    for (let k = 1; k + 1 < out.length; k += 1) {
      if (!conj.has(out[k].token.key)) continue;
      const left = out[k - 1];
      const right = out[k + 1];
      const casesOf = (b) => new Set(b.candidates.filter((c) => NOMINAL.has(c.analysis.pos) && c.analysis.case && c.analysis.case !== 'x').map((c) => c.analysis.case));
      const l = casesOf(left);
      const r = casesOf(right);
      if (!l.size || !r.size) continue;
      const shared = [...l].filter((c) => r.has(c));
      if (!shared.length) continue;
      for (const [i, b, other] of [[k - 1, left, right], [k + 1, right, left]]) {
        if (b.pinned) continue;
        const keep = b.candidates.filter((c) => !NOMINAL.has(c.analysis.pos) || !c.analysis.case || c.analysis.case === 'x' || shared.includes(c.analysis.case));
        if (keep.length < b.candidates.length) out[i] = { ...b, candidates: keep.map((c) => withReason(c, `coordination: shares its case with ${other.token.surface}`)) };
      }
    }
    return out;
  };
}

/* NUM: inside a clause with one finite verb of a certain number and no coordination, a nominative of the
 * other number cannot be its subject or predicate: those readings drop. Greek keeps the neuter plural with a
 * singular verb (τὰ ζῷα τρέχει). */
export function makeNumberStage({ conjunctions = [], neuterPluralTakesSingular = false } = {}) {
  const conj = new Set(conjunctions);
  const FINITE = new Set(['ind', 'sub', 'opt', 'imp']);
  const NOMINAL = new Set(['noun', 'adj', 'pron', 'num', 'vpar', 'det']);
  return function numberStage(blocks) {
    const out = blocks.slice();
    const clauses = new Map();
    out.forEach((b, i) => { const k = b.token.clause ?? 0; if (!clauses.has(k)) clauses.set(k, []); clauses.get(k).push(i); });
    for (const members of clauses.values()) {
      if (members.some((i) => conj.has(out[i].token.key) || out[i].token.enclitic === 'que')) continue;
      const verbish = members.filter((i) => out[i].candidates.some((c) => c.analysis.pos === 'verb'));
      if (verbish.length !== 1) continue;
      const v = out[verbish[0]];
      if (!v.candidates.every((c) => c.analysis.pos === 'verb' && FINITE.has(c.analysis.mood))) continue;
      const numbers = new Set(v.candidates.map((c) => c.analysis.number));
      if (numbers.size !== 1) continue;
      const n = [...numbers][0];
      for (const i of members) {
        const b = out[i];
        if (i === verbish[0] || b.pinned) continue;
        // a reading with no number (a Russian personal pronoun in Wiktionary) is not ruled out by the verb's number
        const keep = b.candidates.filter((c) => !(NOMINAL.has(c.analysis.pos) && c.analysis.case === 'nom' && c.analysis.number && c.analysis.number !== n
          && !(neuterPluralTakesSingular && n === 'sg' && c.analysis.number === 'pl' && c.analysis.gender === 'n')));
        if (keep.length && keep.length < b.candidates.length) {
          const r = `clause: its verb ${v.token.surface} is ${n === 'sg' ? 'singular' : 'plural'}, so a nominative here is too`;
          out[i] = { ...b, candidates: keep.map((c) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] })) };
        }
      }
    }
    return out;
  };
}

/* REL: a relative pronoun opening a clause after a comma takes gender and number from the nearest noun before
 * it (urbs, quae …; partes, quarum …); its case comes from its own clause, so case stays open here. */
export function makeRelativeStage(relativeKeys) {
  const rel = new Set(relativeKeys);
  return function relativeStage(blocks) {
    return blocks.map((b, i) => {
      if (!rel.has(b.token.key) || b.pinned || i === 0 || (b.token.clause ?? 0) === (blocks[i - 1].token.clause ?? 0)) return b;
      let ante = null;
      for (let j = i - 1; j >= 0; j -= 1) {
        if (blocks[j].candidates.some((c) => c.analysis.pos === 'noun' && c.analysis.case && c.analysis.case !== 'x')) { ante = blocks[j]; break; }
      }
      if (!ante) return b;
      const gn = ante.candidates.filter((c) => c.analysis.pos === 'noun').map((c) => [c.analysis.number, c.analysis.gender]);
      const fits = (a) => a.pos !== 'pron' || gn.some(([n, g]) => a.number === n && (a.gender === g || a.gender === 'c' || g === 'c' || a.gender === 'x' || g === 'x'));
      const keep = b.candidates.filter((c) => fits(c.analysis));
      if (!keep.length || keep.length === b.candidates.length) return b;
      const r = `relative clause: agrees with ${ante.token.surface} in gender and number`;
      return { ...b, candidates: keep.map((c) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r], links: [...(c.links ?? []), { kind: 'reference', index: ante.token.index }] })) };
    });
  };
}

/* CASED: a word with case readings drops its caseless noun readings (Russian я: the pronoun, not the letter's name). */
export function casedStage(blocks) {
  return blocks.map((b) => {
    const cased = b.candidates.filter((c) => c.analysis.case && c.analysis.case !== 'x');
    const caselessNoun = (c) => c.analysis.pos === 'noun' && (!c.analysis.case || c.analysis.case === 'x');
    if (!cased.length || b.pinned || !b.candidates.some(caselessNoun)) return b;
    return { ...b, candidates: b.candidates.filter((c) => !caselessNoun(c)) };
  });
}

/* ONE SUBJECT: in a clause with one finite verb and no coordination, a word that is certainly nominative is the
 * subject; the other nouns there are not nominative (Мама пишет письмо: письмо is the object). */
export function makeOneSubjectStage({ conjunctions = [], copulas = [] } = {}) {
  const conj = new Set(conjunctions);
  const cop = new Set(copulas);
  const HEAD = new Set(['noun', 'pron']);
  return function oneSubjectStage(blocks) {
    const out = blocks.slice();
    const clauses = new Map();
    out.forEach((b, i) => { const k = b.token.clause ?? 0; if (!clauses.has(k)) clauses.set(k, []); clauses.get(k).push(i); });
    for (const members of clauses.values()) {
      if (members.some((i) => conj.has(out[i].token.key))) continue;
      const verbs = members.filter((i) => out[i].candidates.length && out[i].candidates.every((c) => c.analysis.pos === 'verb' && c.analysis.mood !== 'inf'));
      if (verbs.length !== 1 || cop.has(out[verbs[0]].token.key)) continue;
      const heads = members.filter((i) => out[i].candidates.some((c) => HEAD.has(c.analysis.pos) && c.analysis.case));
      const certain = heads.filter((i) => out[i].candidates.filter((c) => c.analysis.case).every((c) => c.analysis.case === 'nom'));
      if (certain.length !== 1) continue;
      for (const i of heads) {
        if (i === certain[0] || out[i].pinned) continue;
        const keep = out[i].candidates.filter((c) => c.analysis.case !== 'nom');
        if (keep.length && keep.length < out[i].candidates.length) {
          const r = `clause: ${out[certain[0]].token.surface} is already the subject of ${out[verbs[0]].token.surface}`;
          out[i] = { ...out[i], candidates: keep.map((c) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] })) };
        }
      }
    }
    return out;
  };
}
