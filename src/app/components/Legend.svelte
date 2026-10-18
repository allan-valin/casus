<script>
  /* Feedback B6: a legend table — every colour and border, what it means. */
  import { LEGEND } from '../lib/colors.js';
  import { t, ui, LEGEND_PT } from '../lib/i18n.svelte.js';
  const label = (row) => (ui.lang === 'pt' && LEGEND_PT[row.key] ? LEGEND_PT[row.key][0] : row.label);
  const meaning = (row) => (ui.lang === 'pt' && LEGEND_PT[row.key] ? LEGEND_PT[row.key][1] : row.meaning);
</script>

<table class="legend">
  <thead><tr><th>{t('legend.looks')}</th><th>{t('legend.meaning')}</th></tr></thead>
  <tbody>
    {#each LEGEND as row (row.key)}
      <tr class="row">
        <td>
          <span class="swatch" class:sw-pinned={row.pinned} class:sw-chunk={row.chunk} class:sw-linked={row.linked}
                style:background={row.fill} style:border-color={row.border} style:border-style={row.borderStyle}>
            <span class="word" class:unknown={row.key === 'unknown'}>{label(row)}</span>
            <span class="badge" style:color={row.border}>{row.badge}</span>
            {#if row.dots}<span class="dots">{#each row.dots as d}<i style:background={d}></i>{/each}</span>{/if}
          </span>
        </td>
        <td class="meaning">{meaning(row)}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .legend { border-collapse: collapse; font-size: 0.9rem; width: 100%; max-width: 760px; }
  th { text-align: left; font-weight: 600; color: var(--muted); padding: 4px 8px; border-bottom: 1px solid var(--line); }
  td { padding: 5px 8px; vertical-align: middle; border-bottom: 1px solid var(--line-soft); }
  .meaning { color: var(--ink-2); }
  .swatch { display: inline-flex; align-items: baseline; gap: 5px; border: 2.5px solid; border-radius: 12px; padding: 2px 10px; color: var(--ink); white-space: nowrap; }
  .swatch.sw-pinned { outline: 2px dotted #222; outline-offset: 2px; }
  .swatch.sw-chunk { box-shadow: 0 0 0 3px #fff, 0 0 0 5px #357; }
  .swatch.sw-linked { box-shadow: 0 0 0 3px #ffd54a; }
  .badge { font-size: 0.75em; font-weight: 700; }
  .unknown { font-style: italic; color: #666; }
  .dots { display: inline-flex; gap: 2px; align-items: center; }
  .dots i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
</style>
