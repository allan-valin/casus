/*
 * German noun phrases (docs/languages/de.md §10, rules NP1–NP4; Allan, 2026-10-18 on Kafka).
 * NP1  A phrase is (article word) (adjectives/participles/numerals)* noun, contiguous, no punctuation inside;
 *      every member takes the case, number and gender of its noun.
 * NP2  The article word decides the adjective declension: der-words → weak, ein-words → mixed, none → strong.
 * NP3  Before its noun an article word is an article word, not a pronoun.
 * NP4  A word followed by its governed phrase is the preposition (its other readings drop) — in governmentStage.
 * Pure stage: blocks in, blocks out; never empties a block (narrow() guards that too).
 */
const DER_WORDS = /^(der|die|das|dem|den|des|dies|jen|jed|welch|manch|solch|all|beide)/i;
const EIN_WORDS = /^(ein|kein|mein|dein|sein|ihr|unser|euer|eur)/i;
const MEMBER = new Set(['det', 'adj', 'num']);
// NP2a: a contraction holds a definite article (im = in dem, zur = zu der): what follows is declined weak
const CONTRACTIONS = new Set(['am', 'im', 'beim', 'vom', 'zum', 'zur', 'hinterm', 'überm', 'unterm', 'vorm', 'ans', 'ins', 'aufs', 'durchs', 'fürs', 'ums', 'übers', 'unters', 'vors', 'hinters']);

const triple = (a) => `${a.case}|${a.number}|${a.number === 'pl' ? 'x' : a.gender}`;
function fits(a, set) {
  if (!a.case || a.case === 'x') return true;
  return set.has(triple(a)) || (a.gender === 'x' && [...set].some((t) => t.startsWith(`${a.case}|${a.number}|`)));
}

/** The members of the phrase whose noun is at position i: contiguous det/adj/num blocks before it. */
function membersBefore(blocks, i) {
  const out = [];
  for (let j = i - 1; j >= 0 && out.length < 5; j -= 1) {
    if (blocks[j + 1].token.index - blocks[j].token.index !== 1) break;      // punctuation between
    const poses = blocks[j].candidates.map((c) => c.analysis.pos);
    if (!poses.some((p) => MEMBER.has(p))) break;
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
    const nouns = head.candidates.filter((c) => c.analysis.pos === 'noun');
    if (!nouns.length) continue;
    const members = membersBefore(out, i);
    if (!members.length) continue;
    // NP3: before the noun, an article word is not a pronoun
    for (const j of members) {
      const cs = out[j].candidates;
      if (cs.some((c) => c.analysis.pos === 'det') && cs.some((c) => c.analysis.pos === 'pron')) {
        out[j] = { ...out[j], candidates: cs.filter((c) => c.analysis.pos !== 'pron') };
      }
    }
    // NP1: the triples every member and the noun allow
    let shared = new Set(nouns.map((c) => triple(c.analysis)));
    for (const j of members) {
      const own = new Set(out[j].candidates.filter((c) => MEMBER.has(c.analysis.pos) && c.analysis.case && c.analysis.case !== 'x').map((c) => triple(c.analysis)));
      if (!own.size) continue;
      const next = new Set([...shared].filter((t) => own.has(t) || [...own].some((o) => o.split('|')[2] === 'x' && o.split('|').slice(0, 2).join('|') === t.split('|').slice(0, 2).join('|'))));
      if (next.size) shared = next;
    }
    // NP2: the declension type the article word asks of the adjectives
    const det = members.map((j) => out[j]).find((b) => b.candidates.some((c) => c.analysis.pos === 'det'));
    const before = members.length ? out[members[0] - 1] : null;
    const contracted = before && CONTRACTIONS.has(before.token.key.toLowerCase()) && members[0] > 0 && out[members[0]].token.index - before.token.index === 1;
    const infl = det ? (DER_WORDS.test(det.token.surface) ? 'weak' : EIN_WORDS.test(det.token.surface) ? 'mixed' : null) : contracted ? 'weak' : 'strong';
    const name = head.token.surface;
    const reason = `agreement: in the phrase of ${name}`;
    out[i] = { ...head, candidates: head.candidates.filter((c) => c.analysis.pos !== 'noun' || fits(c.analysis, shared)).map((c) => (c.analysis.pos === 'noun' ? withReason(c, reason) : c)) };
    for (const j of members) {
      out[j] = {
        ...out[j],
        candidates: out[j].candidates
          .filter((c) => !MEMBER.has(c.analysis.pos) || fits(c.analysis, shared))
          // a caseless reading of a member drops once the phrase gives it a case
          .filter((c, _k, all) => !MEMBER.has(c.analysis.pos) || (c.analysis.case && c.analysis.case !== 'x') || !all.some((o) => MEMBER.has(o.analysis.pos) && o.analysis.case && o.analysis.case !== 'x'))
          .filter((c) => c.analysis.pos !== 'adj' || !infl || !c.analysis.infl || c.analysis.infl === 'x' || c.analysis.infl === infl)
          .map((c) => (MEMBER.has(c.analysis.pos) ? withLink(withReason(c, reason), head.token.index) : c)),
      };
    }
  }
  return out;
}
