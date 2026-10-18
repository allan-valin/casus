/*
 * Paradigm tables for the dictionary overlay (Allan, 2026-10-18): every form of a lemma, from
 * data/<code>/paradigms/<bucket>.json (tools/build_paradigms.py), grouped into the tables a grammar prints —
 * cases × numbers (or genders) for nominals, persons × numbers per mood and tense for verbs, the non-finite
 * forms as a list.
 */
import { decodeAnalysis } from '../../lib/lexicon.js';

/** Mirror of tools/build_paradigms.py front_code: [shared length, rest, codes…] after the first row. */
export function frontDecode(coded) {
  const out = [];
  let prev = null;
  for (const row of coded) {
    let form;
    let codes;
    if (prev === null || typeof row[0] !== 'number') { [form, ...codes] = row; } else { form = prev.slice(0, row[0]) + row[1]; codes = row.slice(2); }
    out.push([form, ...codes]);
    prev = form;
  }
  return out;
}

const FINITE = new Set(['ind', 'sub', 'sub1', 'sub2', 'opt', 'imp']);
const TENSES = ['pres', 'impf', 'pret', 'fut', 'aor', 'perf', 'plup', 'futp', 'x'];
const MOODS = ['ind', 'sub', 'sub1', 'sub2', 'opt', 'imp'];
const NUMBERS = ['sg', 'du', 'pl', 'x'];
const GENDERS = ['m', 'f', 'n', 'c', 'x'];
const known = (v) => v != null && v !== 'x';

function colOf(a) {
  if (a.number === 'sg') return a.gender && known(a.gender) ? a.gender : 'sg';
  if (!known(a.gender)) return a.number;
  return `${a.number} ${a.gender}`;
}
function colRank(c) {
  const [n, g] = c.includes(' ') ? c.split(' ') : (GENDERS.includes(c) ? ['sg', c] : [c, 'x']);
  return NUMBERS.indexOf(n) * 10 + GENDERS.indexOf(g);
}

/** -> [{ kind: 'table', label, rowsBy, rows, cols, cell(row, col) } | { kind: 'list', label, items }] */
export function paradigmGroups(rows, lemma, lang) {
  const codes = lang.inventory.codes;
  const caseOrder = lang.inventory.channels.case?.values ?? [];
  const entries = rows.flatMap(([form, ...cs]) => cs.filter((c) => !String(c).startsWith('~')).map((code) => ({ form, code, analysis: decodeAnalysis(code, String(lemma), codes) })));
  // a language with its own table shape (Japanese: plain/polite × positive/negative) builds it itself
  if (lang.inventory.paradigm) return lang.inventory.paradigm(entries);
  const groups = new Map();
  const list = [];
  for (const e of entries) {
    const a = e.analysis;
    if (a.pos === 'verb' && FINITE.has(a.mood) && a.person !== '0') {
      const key = ['v', a.tense, a.mood, a.voice].join('|');
      const label = [a.tense, a.mood, a.voice].filter(known).join(' · ');
      if (!groups.has(key)) groups.set(key, { kind: 'table', label, rowsBy: 'person', items: [], order: 1000 + TENSES.indexOf(a.tense) * 10 + MOODS.indexOf(a.mood) });
      groups.get(key).items.push({ ...e, row: a.person, col: a.number });
    } else if (a.case && a.case !== 'x') {
      const fixedGender = a.pos === 'noun';
      const label = [a.pos === 'vpar' ? 'participle' : null, a.infl, a.degree, a.tense, a.voice].filter(known).join(' · ');
      const key = ['n', label].join('|');
      if (!groups.has(key)) groups.set(key, { kind: 'table', label, rowsBy: 'case', items: [], order: label ? 10 : 0 });
      groups.get(key).items.push({ ...e, row: a.case, col: fixedGender ? a.number : colOf(a) });
    } else if (a.pos === 'verb' || a.pos === 'vpar' || a.pos === 'supine') {
      list.push({ ...e, label: [a.mood ?? a.pos, a.tense, a.voice].filter(known).join(' ') });
    }
  }
  const out = [...groups.values()].sort((x, y) => x.order - y.order).map((g) => {
    const rowsSet = [...new Set(g.items.map((i) => i.row))];
    const rowsOrdered = g.rowsBy === 'case' ? caseOrder.filter((c) => rowsSet.includes(c)) : ['1', '2', '3'].filter((p) => rowsSet.includes(p));
    const cols = [...new Set(g.items.map((i) => i.col))].sort((x, y) => (g.rowsBy === 'person' ? NUMBERS.indexOf(x) - NUMBERS.indexOf(y) : colRank(x) - colRank(y)));
    return {
      kind: 'table', label: g.label, rowsBy: g.rowsBy, rows: rowsOrdered, cols,
      cell: (r, c) => g.items.filter((i) => i.row === r && i.col === c).filter((i, k, all) => all.findIndex((j) => j.form === i.form) === k),
      items: g.items,
    };
  });
  if (list.length) out.push({ kind: 'list', label: 'non-finite', items: list.filter((i, k, all) => all.findIndex((j) => j.form === i.form && j.label === i.label) === k) });
  return out;
}
