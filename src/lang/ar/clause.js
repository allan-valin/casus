import { vowelsAgree, finalVowel, lettersOf } from './normalize.js';
/*
 * Arabic sentence rules (overnight plan 2026-10-19). Each narrows, never empties.
 * prepStage  a preposition whose genitive object the government stage settled is the preposition (إلى is not
 *            the rare noun إِلًى).
 * vsoStage   the verbal sentence: after a verb that is certainly a verb, the first noun not under a preposition is
 *            its subject (nominative, fāʕil) and the next one its object (accusative, mafʕūl bihi), when they can be.
 */
const withReason = (c, r) => (c.reasons.includes(r) ? c : { ...c, reasons: [...c.reasons, r] });
const governed = (b) => b.candidates.some((c) => (c.links ?? []).some((l) => l.kind === 'government'));

export function prepStage(blocks) {
  return blocks.map((b) => {
    const settled = b.candidates.some((c) => c.analysis.pos === 'prep' && (c.links ?? []).some((l) => l.kind === 'government'));
    if (!settled || b.pinned) return b;
    const keep = b.candidates.filter((c) => c.analysis.pos === 'prep');
    return keep.length < b.candidates.length ? { ...b, candidates: keep.map((c) => withReason(c, 'it has taken its object, so the preposition')) } : b;
  });
}

export function vsoStage(blocks) {
  const out = blocks.slice();
  const v = out.findIndex((b) => b.candidates.length && b.candidates.every((c) => c.analysis.pos === 'verb'));
  if (v < 0) return out;
  const roles = [['nom', 'subject (fāʕil) of the verb'], ['acc', 'object (mafʕūl bihi) of the verb']];
  let r = 0;
  for (let i = v + 1; i < out.length && r < roles.length; i += 1) {
    const b = out[i];
    if (b.candidates.every((c) => c.analysis.pos === 'verb')) break;                  // the next clause
    if (governed(b) || b.candidates.some((c) => c.analysis.pos === 'prep')) continue;
    const nouns = b.candidates.filter((c) => c.analysis.pos === 'noun' || c.analysis.pos === 'pron');
    if (!nouns.length) continue;
    const [want, why] = roles[r];
    const keep = b.candidates.filter((c) => !['noun', 'pron', 'adj', 'num', 'ppl'].includes(c.analysis.pos) || c.analysis.case === want);
    if (keep.length && !b.pinned) out[i] = { ...b, candidates: keep.map((c) => withReason(c, `verbal sentence: the ${why} ${out[v].token.surface}`)) };
    r += 1;
    // an adjective right after agrees with it (agreement stage); skip it here
    while (out[i + 1] && out[i + 1].candidates.length && out[i + 1].candidates.every((c) => c.analysis.pos === 'adj')) i += 1;
  }
  return out;
}

/* the adjective (naʕt) follows its noun and agrees with it in case, number, gender and definiteness: both narrow to
 * the readings they share (a noun of unknown gender matches either) */
export function adjectiveStage(blocks) {
  const out = blocks.slice();
  const same = (a, b) => a.case === b.case && a.number === b.number && (!a.gender || !b.gender || a.gender === b.gender) && (!a.state || !b.state || a.state === b.state);
  for (let i = 1; i < out.length; i += 1) {
    const adj = out[i];
    let n = i - 1;
    while (n >= 0 && out[n].candidates.length && out[n].candidates.every((c) => c.analysis.pos === 'adj')) n -= 1;   // a second adjective
    const noun = out[n];
    if (!noun || noun.token.index !== adj.token.index - (i - n) || !adj.candidates.some((c) => c.analysis.pos === 'adj')) continue;
    if (!noun.candidates.some((c) => c.analysis.pos === 'noun')) continue;
    const nouns = noun.candidates.filter((c) => c.analysis.pos === 'noun');
    const adjs = adj.candidates.filter((c) => c.analysis.pos === 'adj');
    const keepA = adjs.filter((a) => nouns.some((x) => same(a.analysis, x.analysis)));
    const keepN = nouns.filter((x) => adjs.some((a) => same(a.analysis, x.analysis)));
    if (!keepA.length || !keepN.length) continue;
    if (!adj.pinned) out[i] = { ...adj, candidates: keepA.map((c) => withReason({ ...c, links: [...(c.links ?? []), { kind: 'agreement', index: noun.token.index }] }, `agrees with ${noun.token.surface}`)) };
    if (!noun.pinned && n === i - 1) out[n] = { ...noun, candidates: keepN.map((c) => withReason({ ...c, links: [...(c.links ?? []), { kind: 'agreement', index: adj.token.index }] }, `its adjective ${adj.token.surface} agrees`)) };
  }
  return out;
}

/* VOWELS: readings whose vowelled spelling disagrees with the vowels the text writes drop (بِسْمِ is not بَسَمَ), and
 * a noun's final vowel tells its case: ُ/ٌ nominative; ِ/ٍ and َ/ً not nominative (َ is also the diptote genitive,
 * ِ also the feminine plural accusative). */
export function vowelStage(blocks) {
  return blocks.map((b) => {
    if (b.pinned || !b.candidates.length) return b;
    const surface = b.token.surface;
    let keep = b.candidates.filter((c) => vowelsAgree(surface, c.analysis.marked, { last: c.analysis.pos === 'verb' }));
    let why = 'the vowels written in the text';
    const v = finalVowel(surface);
    const nominal = (c) => ['noun', 'adj', 'pron'].includes(c.analysis.pos) && c.analysis.case && c.analysis.case !== 'x';
    if (v) {
      const fits = (c) => !nominal(c) || (v === 'u' ? c.analysis.case === 'nom' : c.analysis.case !== 'nom');
      const narrowed = keep.filter(fits);
      if (narrowed.length) { keep = narrowed; why = v === 'u' ? 'the final ُ: nominative' : `the final ${v === 'i' ? 'ِ' : 'َ'}: not nominative`; }
    }
    if (!keep.length || keep.length === b.candidates.length) return b;
    return { ...b, candidates: keep.map((c) => ({ ...c, reasons: [...c.reasons, why] })) };
  });
}

/* IDAFA: a noun in construct (no article, no tanwin) followed by a definite word makes it genitive (اسم الله, رب
 * العالمين). */
const DEFINITE = /^[وفبكل]?\u0627\u0644|^\u0671\u0644/u;
export function idafaStage(blocks) {
  const out = blocks.slice();
  for (let i = 0; i + 1 < out.length; i += 1) {
    const head = out[i];
    const next = out[i + 1];
    const bare = lettersOf(head.token.surface);
    const construct = head.candidates.length && head.candidates.every((c) => c.analysis.pos === 'noun') && !/^\u0627\u0644/u.test(bare) && !/[ًٌٍ]/u.test(head.token.surface);
    const definite = DEFINITE.test(lettersOf(next.token.surface).normalize('NFC')) || next.candidates.some((c) => c.analysis.proper);
    if (!construct || !definite || next.pinned) continue;
    const gen = next.candidates.filter((c) => c.analysis.case === 'gen');
    if (!gen.length || gen.length === next.candidates.length) continue;
    out[i + 1] = { ...next, candidates: gen.map((c) => ({ ...c, reasons: [...c.reasons, `after ${head.token.surface} in construct (iḍāfa): genitive`] })) };
  }
  return out;
}
