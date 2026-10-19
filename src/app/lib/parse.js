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
