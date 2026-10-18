/*
 * The Japanese conjugation table (overnight plan 2026-10-19): rows are what the form does (present, past, te,
 * volitional, conditional, potential, passive, causative, imperative, wanting…), columns plain · polite ·
 * negative · polite negative — the grid a Japanese grammar prints.
 */
const CELL = {
  dict: ['present', 'plain'], polite: ['present', 'polite'], neg: ['present', 'neg'], politeneg: ['present', 'politeneg'],
  past: ['past', 'plain'], politepast: ['past', 'polite'], pastneg: ['past', 'neg'], politepastneg: ['past', 'politeneg'],
  te: ['te', 'plain'], negte: ['te', 'neg'], vol: ['vol', 'plain'], politevol: ['vol', 'polite'],
  cond: ['cond', 'plain'], negcond: ['cond', 'neg'], tara: ['tara', 'plain'], pot: ['pot', 'plain'], pass: ['pass', 'plain'],
  caus: ['caus', 'plain'], imp: ['imp', 'plain'], des: ['des', 'plain'], desneg: ['des', 'neg'], despast: ['despast', 'plain'],
  stem: ['stem', 'plain'], adv: ['adv', 'plain'], attr: ['attr', 'plain'], copula: ['present', 'plain'], noun: ['noun', 'plain'], seem: ['seem', 'plain'], zu: ['zu', 'neg'],
};
const ROWS = ['present', 'past', 'te', 'vol', 'cond', 'tara', 'pot', 'pass', 'caus', 'imp', 'des', 'despast', 'stem', 'attr', 'adv', 'noun', 'seem', 'zu'];
const COLS = ['plain', 'polite', 'neg', 'politeneg'];

export function japaneseParadigm(entries) {
  const items = entries.filter((e) => CELL[e.analysis.form]).map((e) => ({ ...e, row: CELL[e.analysis.form][0], col: CELL[e.analysis.form][1] }));
  if (!items.length) return [];
  const rows = ROWS.filter((r) => items.some((i) => i.row === r));
  const cols = COLS.filter((c) => items.some((i) => i.col === c));
  return [{
    kind: 'table', label: '', rowsBy: 'jform', rows, cols, items,
    cell: (r, c) => items.filter((i) => i.row === r && i.col === c).filter((i, k, all) => all.findIndex((j) => j.form === i.form) === k),
  }];
}
