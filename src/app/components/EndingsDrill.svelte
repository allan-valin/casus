<script>
  /* The endings drill (Allan, 2026-10-18): a model word's table, every cell blank, fill them in any order;
   * Enter or leaving a box checks it. A right answer without its accents counts and shows the full form. */
  import { tick } from 'svelte';
  import { t, ui } from '../lib/i18n.svelte.js';
  import { drillTables, createEndingsGrid } from '../lib/endings.js';
  import { displayForm } from '../lib/entry.js';
  import { romanOf } from '../lib/roman.js';
  let { lang, models, random = Math.random, loadParadigm = null } = $props();

  let wordIndex = $state(0);
  let random_ = $state(null);          // a random word of the model's table, or null for the model itself
  let loading = $state(false);
  let tableIndex = $state(0);
  let grid = null;
  let cells = $state([]);
  let score = $state({ right: 0, firstTry: 0, total: 0, done: false });
  let typed = $state({});
  let note = $state('');

  const model = $derived(random_ ?? models[wordIndex] ?? null);
  const base = $derived(models[wordIndex] ?? null);
  const randomTitle = $derived(base?.irregular ? t('drill.irregular') : base?.pool?.length ? t('drill.random.title', { n: base.pool.length }) : t('drill.noPool'));
  const tables = $derived(model ? drillTables(model, lang) : []);
  const table = $derived(tables[tableIndex] ?? null);
  const romanize = $derived(lang.script?.romanize ?? null);
  const glossOf = (m) => (typeof m.gloss === 'string' ? m.gloss : (m.gloss?.[ui.lang] ?? m.gloss?.en ?? ''));
  const caseName = (c) => lang.inventory.channels.case?.name?.[ui.lang]?.[c] ?? lang.inventory.channels.case?.name?.en?.[c] ?? c;
  const word = (s) => (t(`para.${s}`) === `para.${s}` ? s : t(`para.${s}`));
  const label = (s) => s.split(' · ').map(word).join(' · ');
  const colName = (c) => c.split(' ').map(word).join(' ');
  const rowName = (r) => (table?.rowsBy === 'case' ? caseName(r) : table?.rowsBy === 'jform' ? t(`para.ja.${r}`) : t(`para.p${r}`));

  function start() {
    if (!table) { grid = null; cells = []; return; }
    grid = createEndingsGrid(table, lang);
    cells = grid.cells.map((c) => ({ ...c }));
    score = { ...grid.score };
    typed = {};
    note = '';
  }
  $effect(() => { void table; start(); });

  function pick(i) { wordIndex = i; tableIndex = 0; random_ = null; }
  // "Random word" (Allan, 2026-10-18): a dictionary word that follows the chosen model's table exactly (the build
  // matched them, tools/build_drills.py); irregular models are learnt as they are
  async function randomWord() {
    const base = models[wordIndex];
    if (!base?.pool?.length || !loadParadigm) return;
    const [id, dict_form, gloss] = base.pool[Math.floor(random() * base.pool.length)];
    loading = true;
    const rows = await loadParadigm(id).catch(() => null);
    loading = false;
    if (rows) { random_ = { id, dict_form, gloss: { en: gloss }, pos: base.pos, rows, like: base.dict_form }; tableIndex = 0; }
  }

  const at = (r, c) => cells.findIndex((x) => x.row === r && x.col === c);
  function check(i) {
    if (!grid || i < 0) return;
    const res = grid.check(i, typed[i] ?? '');
    cells = grid.cells.map((c) => ({ ...c }));
    score = { ...grid.score };
    note = res.ok && !res.exact ? t('drill.marks', { form: displayForm(res.form) }) : '';
    if (res.ok) tick().then(() => { const next = cells.findIndex((c, k) => k > i && c.state !== 'right' && c.state !== 'revealed'); document.querySelector(`input[data-index="${next}"]`)?.focus(); });
  }
  function reveal() { grid?.reveal(); cells = grid.cells.map((c) => ({ ...c })); score = { ...grid.score }; }
</script>

{#if !models.length}
  <p class="muted">{t('drill.loading')}</p>
{:else}
  <div class="controls">
    <label>{t('drill.word')}
      <select class="drill-word-select" value={wordIndex} onchange={(e) => pick(Number(e.currentTarget.value))}>
        {#each models as m, i}<option value={i}>{displayForm(m.dict_form)}{romanize ? ` (${romanOf(m.headword, romanize)})` : ''}{glossOf(m) ? ` — ${glossOf(m)}` : ''}</option>{/each}
      </select>
    </label>
    <button class="random-word" onclick={randomWord} disabled={!base?.pool?.length || loading} title={randomTitle}>{t('drill.random')}</button>
    {#if random_}<button class="back-to-model" onclick={() => { random_ = null; tableIndex = 0; }}>{t('drill.backTo', { word: displayForm(base.dict_form).split(',')[0] })}</button>{/if}
    {#if tables.length > 1}
      <label>{t('drill.table')}
        <select class="drill-table-select" bind:value={tableIndex}>
          {#each tables as tb, i}<option value={i}>{tb.label ? label(tb.label) : t('para.declension')}</option>{/each}
        </select>
      </label>
    {/if}
  </div>
  <p class="drill-word"><b>{displayForm(model.dict_form)}</b>{#if romanize} <span class="roman">{romanOf(model.headword ?? model.dict_form.split(',')[0], romanize)}</span>{/if}{#if glossOf(model)} <span class="gloss">{glossOf(model)}</span>{/if}{#if model.like} <span class="like">{t(model.pos === 'verb' ? 'drill.likeVerb' : 'drill.like', { word: displayForm(model.like).split(',')[0] })}</span>{/if}{#if base?.irregular && !random_} <span class="like">{t('drill.irregularShort')}</span>{/if}</p>
  {#if table}
    <div class="table-scroll"><table class="drill-table">
      <thead><tr><th></th>{#each table.cols as c}<th>{colName(c)}</th>{/each}</tr></thead>
      <tbody>
        {#each table.rows as r}
          <tr><th>{rowName(r)}</th>
            {#each table.cols as c}
              {@const i = at(r, c)}
              {#if i < 0}<td class="empty"></td>
              {:else}
                {@const cell = cells[i]}
                <td class={cell.state} data-cell-box={`${r}|${c}`}>
                  {#if cell.state === 'right' || cell.state === 'revealed'}<span class="answer">{displayForm(cell.shown)}</span>{#if romanize}<span class="roman">{[...new Set(cell.shown.split(', ').map((f) => romanOf(f, romanize)))].join(', ')}</span>{/if}
                  {:else}<input data-cell={`${r}|${c}`} data-index={i} aria-label={`${rowName(r)} ${colName(c)}`} autocomplete="off" autocapitalize="off" spellcheck="false"
                         value={typed[i] ?? ''} oninput={(e) => { typed[i] = e.currentTarget.value; }}
                         onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); check(i); } }} onblur={() => check(i)} />{/if}
                </td>
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table></div>
    <p class="score" aria-live="polite">{score.right} / {score.total} · {t('game.firstTry')}: {score.firstTry}{#if score.done} · {t('game.done')}{/if}</p>
    {#if note}<p class="note">{note}</p>{/if}
    <div class="controls">
      <button class="reveal" onclick={reveal} disabled={score.done}>{t('game.reveal')}</button>
      <button onclick={start}>{t('drill.again')}</button>
    </div>
  {/if}
{/if}

<style>
  .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0; }
  label { display: inline-flex; gap: 6px; align-items: center; max-width: 100%; }
  select { max-width: 100%; min-width: 0; }
  select, button { font: inherit; padding: 6px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); }
  button:hover { border-color: var(--accent); }
  .drill-word { font-size: 1.15rem; margin: 8px 0; }
  .roman { font-style: italic; color: var(--ink-2); font-size: 0.85em; }
  td .roman { display: block; font-size: 0.78em; }
  .like { color: #6b4e9b; font-size: 0.85em; margin-left: 0.5em; }
  .gloss { color: var(--ink-2); font-style: italic; margin-left: 0.5em; }
  .table-scroll { overflow-x: auto; max-width: 100%; }
  .drill-table { border-collapse: collapse; }
  @media (max-width: 600px) { input { width: 6em; } .drill-table th, .drill-table td { padding: 3px 3px; } }
  .drill-table th, .drill-table td { border: 1px solid var(--line-soft); padding: 4px 6px; text-align: left; }
  .drill-table th { color: var(--ink-2); background: var(--panel-hi); font-weight: 600; }
  input { font: inherit; width: 9em; max-width: 28vw; padding: 4px 6px; border: 1.5px solid var(--line); border-radius: 6px; background: var(--panel); color: var(--ink); }
  td.wrong input { border-color: #c0392b; background: #fdecea; }
  td.right { background: #e3f4e8; }
  td.right .answer { color: #1e6b3a; font-weight: 700; }
  td.revealed .answer { color: var(--ink-2); font-style: italic; }
  .score { font-weight: 600; }
  .note { color: #6b4e9b; }
  .muted { color: var(--muted); }
</style>
