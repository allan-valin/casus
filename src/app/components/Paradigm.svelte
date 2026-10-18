<script>
  /* The whole declension or conjugation of a lemma, under its dictionary entry (Allan, 2026-10-18).
   * Cells holding a reading still open for the word: border and background; the same spelling in a cell the
   * cascade ruled out: a lighter mark. Sections that contain the word open, the rest folded. */
  import { paradigmGroups } from '../lib/paradigm.js';
  import { t, ui } from '../lib/i18n.svelte.js';
  import { displayForm } from '../lib/entry.js';
  import { romanOf } from '../lib/roman.js';
  let { rows, lemma, lang, form, readings = [], openAll = false } = $props();
  const romanize = $derived(lang.script?.romanize ?? null);      // Greek tables: Latin letters under each form
  const groups = $derived(paradigmGroups(rows, lemma, lang));
  const norm = (s) => lang.script.normalize(s ?? '');
  const caseName = (c) => lang.inventory.channels.case?.name?.[ui.lang]?.[c] ?? c;
  const label = (s) => s.split(' · ').map((p) => t(`para.${p}`) === `para.${p}` ? p : t(`para.${p}`)).join(' · ');
  const colName = (c) => c.split(' ').map((p) => (t(`para.${p}`) === `para.${p}` ? p : t(`para.${p}`))).join(' ');
  const rowName = (g, r) => (g.rowsBy === 'case' ? caseName(r) : g.rowsBy === 'jform' ? t(`para.ja.${r}`) : t(`para.p${r}`));
  // readings: codes, or analyses (as the cascade leaves them on the block)
  const sig = (a) => JSON.stringify(Object.entries(a).filter(([k]) => k !== 'lemma' && k !== 'marked').sort());
  const open = $derived(new Set(readings.map((r) => (typeof r === 'string' ? r : sig(r)))));
  const isReading = (i) => open.has(i.code) || open.has(sig(i.analysis));
  function mark(cellItems) {
    if (cellItems.some((i) => isReading(i) && norm(i.form) === norm(form))) return 'reading';
    if (cellItems.some((i) => norm(i.form) === norm(form))) return 'same-form';
    return '';
  }
  const hasWord = (g) => (g.kind === 'table' ? g.items : g.items).some((i) => norm(i.form) === norm(form));
</script>

<div class="paradigm">
  {#each groups as g, gi (gi)}
    <details open={openAll || hasWord(g)}>
      <summary>{g.kind === 'list' ? t('para.nonfinite') : (g.label ? label(g.label) : t('para.declension'))}</summary>
      {#if g.kind === 'table'}
        <table>
          <thead><tr><th></th>{#each g.cols as c}<th>{colName(c)}</th>{/each}</tr></thead>
          <tbody>
            {#each g.rows as r}
              <tr><th>{rowName(g, r)}</th>
                {#each g.cols as c}
                  {@const items = g.cell(r, c)}
                  <td class={mark(items)} data-cell={`${r}|${c}`}>{items.map((i) => displayForm(i.form)).join(', ')}{#if romanize && items.length}<span class="roman">{[...new Set(items.map((i) => romanOf(i.form, romanize)))].join(', ')}</span>{/if}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <ul>{#each g.items as i}<li class={mark([i])}>{label(i.label.replaceAll(' ', ' · '))}: <b>{displayForm(i.form)}</b>{#if romanize} <span class="roman inline">{romanOf(i.form, romanize)}</span>{/if}</li>{/each}</ul>
      {/if}
    </details>
  {/each}
</div>

<style>
  .paradigm { margin-top: 8px; font-size: 0.9rem; }
  details { margin: 4px 0; }
  summary { cursor: pointer; font-weight: 600; color: var(--ink-2); padding: 4px 8px; border: 1px solid var(--line); border-radius: 6px; display: inline-block; }
  table { border-collapse: collapse; margin: 6px 0; }
  th, td { border: 1px solid var(--line-soft); padding: 3px 8px; text-align: left; }
  th { color: var(--ink-2); font-weight: 600; background: var(--panel-hi); }
  td.reading { border: 2px solid var(--accent); background: color-mix(in srgb, var(--accent) 16%, white); font-weight: 700; }
  td.same-form, li.same-form { background: color-mix(in srgb, var(--accent) 6%, white); outline: 1px dashed var(--muted); }
  li.reading { font-weight: 700; color: var(--accent); }
  ul { margin: 4px 0; padding-left: 18px; }
  .roman { display: block; font-size: 0.78em; font-style: italic; color: var(--ink-2); }
  .roman.inline { display: inline; }
</style>
