/*
 * Parse the form (drills research 2026-10-20, item 2; the Wheelock/D'Ooge "identify" exercise): a form of a model
 * word, and the learner chooses what it is. The answers are the cells of the word's own tables; a form with several
 * readings (rosae: genitive or dative singular, nominative or vocative plural) counts any of them as right, so none of
 * its readings is ever offered as a wrong answer.
 */
import { drillTables } from './endings.js';

/** label(table, row, col) names a cell in the interface language, the table's own label (tense · mood) included when
 * the word has several tables */
export function parseItems(model, lang, label) {
  const tables = drillTables(model, lang);
  const cells = [];
  for (const t of tables) {
    for (const r of t.rows) {
      for (const c of t.cols) {
        const name = label(t, r, c, tables.length > 1);
        for (const f of new Set(t.cell(r, c).map((i) => i.form))) cells.push({ form: f, name });
      }
    }
  }
  const names = [...new Set(cells.map((x) => x.name))];
  const byForm = new Map();
  for (const x of cells) byForm.set(x.form, [...new Set([...(byForm.get(x.form) ?? []), x.name])]);
  return [...byForm].map(([form, readings]) => ({
    prompt: form,
    answer: readings[0],
    accept: readings,
    pool: names.filter((n) => !readings.includes(n)),
  }));
}

/** one-step transformation (the textbook "put it in the plural" drill): two cells of a table that differ in one
 * feature — same row, other number; same column, other case or person. The learner types the other form. A form that
 * fills two cells is not asked (which one would be meant?). name(value) says the change in the interface language. */
export function transformItems(model, lang, name) {
  const out = [];
  for (const t of drillTables(model, lang)) {
    const cell = new Map();
    const where = new Map();
    for (const r of t.rows) {
      for (const c of t.cols) {
        const forms = [...new Set(t.cell(r, c).map((i) => i.form))];
        if (!forms.length) continue;
        cell.set(`${r}|${c}`, forms);
        for (const f of forms) where.set(f, (where.get(f) ?? 0) + 1);
      }
    }
    for (const r of t.rows) {
      for (const c of t.cols) {
        const from = cell.get(`${r}|${c}`);
        if (!from || from.length !== 1 || where.get(from[0]) > 1) continue;
        const targets = [...t.cols.filter((c2) => c2 !== c).map((c2) => [r, c2, c2]), ...t.rows.filter((r2) => r2 !== r).map((r2) => [r2, c, r2])];
        for (const [r2, c2, change] of targets) {
          const to = cell.get(`${r2}|${c2}`);
          if (!to) continue;
          out.push({ from: from[0], change, prompt: `${from[0]} → ${name(change)}`, answer: to[0], accept: to });
        }
      }
    }
  }
  return out;
}
