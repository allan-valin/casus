/*
 * Rules a Latin or Greek teacher applies to any sentence (Allan, 2026-10-18: "make them more sure").
 * Each narrows, never empties (narrow() guards), and is a stage(blocks, ctx).
 * PREP  A preposition whose object the government stage settled is the preposition: its interjection, particle, adverb and
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
    const keep = b.candidates.filter((c) => !(['interj', 'particle', 'adv'].includes(c.analysis.pos) || ((c.analysis.pos === 'noun' || c.analysis.pos === 'pron') && (!c.analysis.case || c.analysis.case === 'x'))));
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
        const keep = b.candidates.filter((c) => !(NOMINAL.has(c.analysis.pos) && c.analysis.case === 'nom' && c.analysis.number && c.analysis.number !== 'x' && c.analysis.number !== n
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

/* PHRASE: an article and adjectives right before a noun share case, number and gender with it, both ways (ένα βιβλίο:
 * the article's accusative settles the noun). Never empties; only contiguous words of one clause. */
export function phraseAgreementStage(blocks) {
  const out = blocks.slice();
  const MEMBER = new Set(['det', 'adj', 'num']);
  // 'x' (the decoder's unknown) and a missing value agree with anything
  const known = (v) => v && v !== 'x';
  const same = (a, b) => a.case === b.case && (!known(a.number) || !known(b.number) || a.number === b.number) && (!known(a.gender) || !known(b.gender) || a.gender === b.gender);
  for (let i = 0; i < out.length; i += 1) {
    if (!out[i].candidates.some((c) => c.analysis.pos === 'noun' && c.analysis.case)) continue;
    let j = i - 1;
    while (j >= 0 && out[j + 1].token.index - out[j].token.index === 1 && out[j].token.clause === out[i].token.clause
      && out[j].candidates.length && out[j].candidates.every((c) => MEMBER.has(c.analysis.pos))) j -= 1;
    const members = [];
    for (let k = j + 1; k < i; k += 1) members.push(k);
    if (!members.length) continue;
    const nouns = out[i].candidates.filter((c) => c.analysis.pos === 'noun' && c.analysis.case);
    let triples = nouns.map((c) => c.analysis);
    for (const k of members) {
      const own = out[k].candidates.map((c) => c.analysis).filter((a) => a.case);
      const kept = triples.filter((t) => own.some((a) => same(a, t)));
      if (!kept.length) { triples = null; break; }
      triples = kept;
    }
    if (!triples) continue;
    const fits = (a) => !a.case || triples.some((t) => same(a, t));
    for (const k of [...members, i]) {
      if (out[k].pinned) continue;
      const keep = out[k].candidates.filter((c) => fits(c.analysis));
      if (keep.length && keep.length < out[k].candidates.length) {
        const r = `phrase: agrees with ${out[k === i ? members[0] : i].token.surface}`;
        out[k] = { ...out[k], candidates: keep.map((c) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] })) };
      }
    }
  }
  return out;
}

/* PROPER NAMES: the streamed dictionaries leave names out, so a capitalised word the dictionary does not know is read
 * as a name (a noun, case unknown) rather than shown as unknown (Maria, Praze). */
export function properNameStage(blocks) {
  return blocks.map((b) => {
    if (b.candidates.length || b.pinned || !/^\p{Lu}\p{Ll}/u.test(b.token.surface ?? '')) return b;
    return { ...b, candidates: [{ analysis: { lemma: b.token.surface, pos: 'noun', proper: true }, reasons: ['capitalised and not in the dictionary: a name'], links: [] }] };
  });
}

/* A NAME AFTER AN ARTICLE takes the article's case, gender and number (Η Μαρία: nominative), and the article is the
 * article (not Η the numeral or ή "or"). */
export function nameArticleStage(blocks) {
  const out = blocks.slice();
  for (let i = 1; i < out.length; i += 1) {
    const name = out[i];
    const art = out[i - 1].candidates.filter((c) => c.analysis.pos === 'det' && c.analysis.case && c.analysis.case !== 'x');
    if (name.pinned || !art.length || !name.candidates.length || !name.candidates.every((c) => c.analysis.proper)) continue;
    const why = `after the article ${out[i - 1].token.surface}: its case`;
    out[i] = { ...name, candidates: art.map((a) => ({ ...name.candidates[0], analysis: { ...name.candidates[0].analysis, case: a.analysis.case, gender: a.analysis.gender, number: a.analysis.number }, reasons: [...name.candidates[0].reasons, why] })) };
    if (!out[i - 1].pinned) out[i - 1] = { ...out[i - 1], candidates: art };
  }
  return out;
}

/* "AND": the language's own coordinating words read as conjunctions even where the dictionary lost them (Polish i). */
export function makeConjunctionStage(conjunctions) {
  const and = new Set(conjunctions);
  return (blocks) => blocks.map((b) => (and.has(b.token.key) && !b.candidates.length && !b.pinned
    ? { ...b, candidates: [{ analysis: { lemma: b.token.key, pos: 'conj' }, reasons: ['a coordinating word (Casus list)'], links: [] }] }
    : b));
}

/* PERSON: a clause whose finite verbs are all 1st or 2nd person has its subject in the verb (kupiłem "I bought"), so a
 * noun there is not nominative — unless the verb is a copula (jsem učitel "I am a teacher"). */
export function makePersonStage(copulas = []) {
  const cop = new Set(copulas);
  return function personStage(blocks) {
    const byClause = new Map();
    blocks.forEach((b, i) => { const c = b.token.clause ?? 0; if (!byClause.has(c)) byClause.set(c, []); byClause.get(c).push(i); });
    const out = blocks.slice();
    for (const idx of byClause.values()) {
      const verbs = idx.filter((i) => out[i].candidates.length && out[i].candidates.every((c) => c.analysis.pos === 'verb' && c.analysis.person));
      if (!verbs.length || verbs.some((i) => cop.has(out[i].token.key) || out[i].candidates.some((c) => c.analysis.person === '3'))) continue;
      for (const i of idx) {
        const b = out[i];
        const keep = b.candidates.filter((c) => !(c.analysis.pos === 'noun' && c.analysis.case === 'nom'));
        if (b.pinned || keep.length === b.candidates.length || !keep.length) continue;
        out[i] = { ...b, candidates: keep.map((c) => ({ ...c, reasons: [...c.reasons, `the verb ${out[verbs[0]].token.surface} is its own subject: not nominative`] })) };
      }
    }
    return out;
  };
}

/* ONE VERB: a clause with a certain finite verb and no conjunction has no second one, so a word that could also be a
 * finite verb is its other reading (Luen kirjaa: kirjaa the noun, not kirjata). */
export function makeOneVerbStage(conjunctions = []) {
  const conj = new Set(conjunctions);
  const finite = (c) => c.analysis.pos === 'verb' && c.analysis.person;
  return function oneVerbStage(blocks) {
    const byClause = new Map();
    blocks.forEach((b, i) => { const c = b.token.clause ?? 0; if (!byClause.has(c)) byClause.set(c, []); byClause.get(c).push(i); });
    const out = blocks.slice();
    for (const idx of byClause.values()) {
      if (idx.some((i) => conj.has(out[i].token.key) || out[i].candidates.some((c) => c.analysis.pos === 'conj'))) continue;
      const sure = idx.filter((i) => out[i].candidates.length && out[i].candidates.every(finite));
      if (!sure.length) {
        // no certain verb: the only word that could be one, agreeing with a certain nominative, is the verb (siostra mieszka)
        const maybe = idx.filter((i) => out[i].candidates.some(finite));
        const subj = idx.find((i) => out[i].candidates.length && out[i].candidates.every((c) => c.analysis.case === 'nom' && ['noun', 'pron'].includes(c.analysis.pos)));
        if (maybe.length === 1 && subj !== undefined && !out[maybe[0]].pinned) {
          const n = out[subj].candidates[0].analysis.number;
          const verbs = out[maybe[0]].candidates.filter((c) => finite(c) && (!n || c.analysis.number === n) && (c.analysis.person === '3' || out[subj].candidates[0].analysis.pos === 'pron'));
          if (verbs.length) out[maybe[0]] = { ...out[maybe[0]], candidates: verbs.map((c) => ({ ...c, reasons: [...c.reasons, `the clause's only verb, agreeing with ${out[subj].token.surface}`] })) };
        }
        continue;
      }
      if (sure.length !== 1) continue;
      for (const i of idx) {
        const b = out[i];
        if (i === sure[0] || b.pinned) continue;
        const keep = b.candidates.filter((c) => !finite(c));
        if (!keep.length || keep.length === b.candidates.length) continue;
        out[i] = { ...b, candidates: keep.map((c) => ({ ...c, reasons: [...c.reasons, `${out[sure[0]].token.surface} is the clause's verb`] })) };
      }
    }
    return out;
  };
}
