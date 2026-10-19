/* The Korean conjugation table (overnight plan 2026-10-19): rows are the speech levels (합니다 formal polite,
 * 해요 polite, 해 casual, 한다 plain), columns present · past · question · past question; then the connective forms. */
const LEVELS = ['hamnida', 'haeyo', 'hae', 'handa'];
const COLS = { '': 'present', ' past': 'past', ' q': 'question', ' past q': 'pastq', ' imp': 'imperative', ' let': 'lets' };

export function koreanParadigm(entries) {
  const items = [];
  for (const e of entries) {
    const f = e.analysis.form;
    if (!f) continue;
    const level = LEVELS.find((l) => f === l || f.startsWith(`${l} `));
    if (level) { const col = COLS[f.slice(level.length)]; if (col) items.push({ ...e, row: level, col }); continue; }
    if (['inf', 'seq', 'if', 'dict'].includes(f)) items.push({ ...e, row: f, col: 'present' });
  }
  if (!items.length) return [];
  const rows = [...LEVELS, 'dict', 'inf', 'seq', 'if'].filter((r) => items.some((i) => i.row === r));
  const cols = Object.values(COLS).filter((c) => items.some((i) => i.col === c));
  return [{ kind: 'table', label: '', rowsBy: 'jform', rows, cols, items,
    cell: (r, c) => items.filter((i) => i.row === r && i.col === c).filter((i, k, all) => all.findIndex((j) => j.form === i.form) === k) }];
}
