<script>
  /* The IPA chart, with a sample recording behind every symbol that has one (public/ipa-sounds, Wikimedia Commons),
   * and, as `howto`, the same chart taken apart: each column (place) and row (manner) on its own, explained. */
  import { t, ui } from '../lib/i18n.svelte.js';
  import { CHART } from '../speech/ipachart.js';
  import { PLACES, MANNERS } from '../lib/i18n.speak.js';
  import { sampleFor } from '../lib/pronounce.js';
  let { mode = 'chart', samples = {}, play, used = new Set(), onclose } = $props();
  const P = CHART.pulmonic;
  const name = (table, k) => (table[k]?.[ui.lang] ?? table[k]?.en ?? [k, ''])[0];
  const what = (table, k) => (table[k]?.[ui.lang] ?? table[k]?.en ?? [k, ''])[1];
  const has = (s) => !!sampleFor(s, samples);
  // the symbols of one column / one row, as [voiceless, voiced] pairs
  const column = (pi) => P.cells.map((row, mi) => [P.manners[mi], row[pi]]).filter(([, c]) => Array.isArray(c) && (c[0] || typeof c[1] === 'string'));
  const row = (mi) => P.cells[mi].map((c, pi) => [P.places[pi], c]).filter(([, c]) => Array.isArray(c) && (c[0] || typeof c[1] === 'string'));
  const heights = [0, 1, 2, 3, 4, 5, 6];
</script>

{#snippet sym(s)}
  {#if s && typeof s === 'string'}<button class="sym" class:has={has(s)} class:used={used.has(s)} title={has(s) ? t('speak.sound.title', { sym: s }) : t('speak.sound.missing', { sym: s })} onclick={() => play(s)}>{s}</button>{/if}
{/snippet}

<div class="ipa-panel" role="dialog" aria-label={mode === 'chart' ? t('speak.chart') : t('speak.howto')}>
  <div class="panel-head"><h3>{mode === 'chart' ? t('speak.chart') : t('speak.howto')}</h3><button class="close" onclick={onclose}>✕ {t('speak.close')}</button></div>
  <p class="hint">{t('speak.chart.hint')}</p>
  {#if mode === 'howto'}<div class="prose">{@html t('speak.howto.intro')}</div>{/if}

  {#if mode === 'chart'}
    <h4>{t('speak.chart.consonants')}</h4>
    <div class="scroll"><table class="pulmonic">
      <thead><tr><th></th>{#each P.places as p}<th title={what(PLACES, p)}>{name(PLACES, p)}</th>{/each}</tr></thead>
      <tbody>{#each P.cells as r, mi}<tr><th title={what(MANNERS, P.manners[mi])}>{name(MANNERS, P.manners[mi])}</th>
        {#each r as c}<td class:x={c === 'impossible'}>{#if Array.isArray(c)}<span class="pair">{@render sym(c[0])}{@render sym(c[1])}</span>{/if}</td>{/each}</tr>{/each}</tbody>
    </table></div>
  {:else}
    <h4>{t('speak.howto.places')}</h4>
    {#each P.places as p, pi}
      <div class="part"><div class="part-head"><b>{name(PLACES, p)}</b> — {what(PLACES, p)}</div>
        <div class="part-syms">{#each column(pi) as [m, c]}<span class="labelled"><span class="pair">{@render sym(c[0])}{@render sym(c[1])}</span><small>{name(MANNERS, m)}</small></span>{/each}</div></div>
    {/each}
    <h4>{t('speak.howto.manners')}</h4>
    {#each P.manners as m, mi}
      <div class="part"><div class="part-head"><b>{name(MANNERS, m)}</b> — {what(MANNERS, m)}</div>
        <div class="part-syms">{#each row(mi) as [p, c]}<span class="labelled"><span class="pair">{@render sym(c[0])}{@render sym(c[1])}</span><small>{name(PLACES, p)}</small></span>{/each}</div></div>
    {/each}
  {/if}

  <h4>{mode === 'howto' ? t('speak.howto.vowels') : t('speak.chart.vowels')}</h4>
  {#if mode === 'howto'}<div class="prose">{@html t('speak.howto.vowels.text')}</div>{/if}
  <div class="vowels" dir="ltr">
    {#each heights as h}<div class="vrow">{#each [0, 0.5, 1, 1.5, 2] as b}<span class="vcell">{#each CHART.vowels.filter((v) => v.height === h && v.back === b) as v}{@render sym(v.sym)}{/each}</span>{/each}</div>{/each}
  </div>

  <h4>{t('speak.chart.other')}</h4>
  <div class="part-syms">{#each [...CHART.other, ...CHART.nonpulmonic.filter((d) => d.sym !== 'ʼ')] as d}<span class="labelled">{@render sym(d.sym)}<small>{d.label}</small></span>{/each}</div>
  {#if mode === 'howto'}<h4>{t('speak.howto.marks')}</h4><div class="prose">{@html t('speak.howto.marks.text')}</div>{/if}
</div>

<style>
  .ipa-panel { overflow-x: hidden; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 12px 16px; margin: 10px 0; }
  .panel-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .panel-head h3 { margin: 0; }
  .hint { color: var(--ink-2); font-size: .9em; }
  .scroll { overflow-x: auto; }
  table.pulmonic { border-collapse: collapse; font-size: .85em; }
  .pulmonic th { font-weight: 600; padding: 2px 4px; color: var(--ink-2); font-size: .85em; }
  .pulmonic td { border: 1px solid var(--line); padding: 2px; text-align: center; min-width: 52px; }
  .pulmonic td.x { background: var(--line); }
  .pair { display: inline-flex; gap: 2px; }
  .sym { font-family: 'Charis SIL', 'Doulos SIL', 'Gentium Plus', 'Noto Sans', serif; font-size: 1.15rem; min-width: 30px; min-height: 30px; padding: 0 4px; position: relative; }
  .sym.has::after { content: ''; position: absolute; right: 2px; bottom: 2px; width: 5px; height: 5px; border-radius: 50%; background: var(--accent, #3a7); }
  .sym.used { outline: 2px solid var(--accent, #3a7); }
  .part { margin: 6px 0 10px; }
  .part-head { margin-bottom: 4px; }
  .part-syms { display: flex; flex-wrap: wrap; gap: 6px; }
  .labelled { display: inline-flex; flex-direction: column; align-items: center; }
  .labelled small { font-size: .7em; color: var(--muted); max-width: 9em; text-align: center; }
  .vowels { display: block; max-width: 100%; overflow-x: auto; border-left: 1px solid var(--line); }
  .vrow { display: flex; }
  .vrow:nth-child(n) { margin-left: calc(var(--i, 0) * 1px); }
  .vcell { min-width: 58px; display: inline-flex; gap: 2px; padding: 2px; }
</style>
