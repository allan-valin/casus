/*
 * The endings drill (Allan, 2026-10-18): a model word's whole declension or conjugation table with the cells
 * blank; fill them in any order. Tables come from the same paradigm data and grouping as the dictionary.
 * An answer counts when it matches any form the cell allows, ignoring case, spacing and (for scripts with
 * marks) accents and breathings; the result says when marks were missing, so the learner sees the full form.
 */
import { frontDecode, paradigmGroups } from './paradigm.js';

export function drillTables(model, lang) {
  return paradigmGroups(frontDecode(model.rows), model.id, lang).filter((g) => g.kind === 'table');
}

const bare = (s) => s.normalize('NFD').replace(/̄|̆/g, '').normalize('NFC');   // Latin macrons, breves
export function sameAnswer(typed, form, lang) {
  const t = bare((typed ?? '').trim()).toLowerCase();
  const f = bare(form).toLowerCase();
  if (t === f) return { ok: true, exact: true };
  const strip = lang.script?.strip;
  if (strip && strip(t) === strip(f)) return { ok: true, exact: false };
  return { ok: false, exact: false };
}

export function createEndingsGrid(table, lang) {
  const cells = [];
  for (const row of table.rows) {
    for (const col of table.cols) {
      const forms = [...new Set(table.cell(row, col).map((i) => i.form))];
      if (forms.length) cells.push({ row, col, forms, state: 'blank', tries: 0, shown: '' });
    }
  }
  const score = { right: 0, firstTry: 0, total: cells.length, done: false };
  const finish = () => { score.done = cells.every((c) => c.state === 'right' || c.state === 'revealed'); };
  return {
    cells,
    score,
    check(i, typed) {
      const c = cells[i];
      if (!c || c.state === 'right' || c.state === 'revealed' || !(typed ?? '').trim()) return { ok: false };
      c.tries += 1;
      const hit = c.forms.map((f) => ({ f, r: sameAnswer(typed, f, lang) })).find((x) => x.r.ok);
      if (!hit) { c.state = 'wrong'; return { ok: false }; }
      c.state = 'right';
      c.shown = hit.f;
      c.exact = hit.r.exact;
      score.right += 1;
      if (c.tries === 1) score.firstTry += 1;
      finish();
      return { ok: true, exact: hit.r.exact, form: hit.f };
    },
    reveal() {
      for (const c of cells) if (c.state !== 'right') { c.state = 'revealed'; c.shown = c.forms.join(', '); }
      finish();
    },
  };
}
