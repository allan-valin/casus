<script>
  import { describeAnalysis } from '../lib/colors.js';
  import { t, ui } from '../lib/i18n.svelte.js';
  import { reasonText } from '../lib/reasons.js';
  let { block, reader } = $props();
  const index = $derived(block.token.index);

  function headword(analysis) {
    const r = reader.lexiconExtras?.lemmas?.[String(analysis.lemma)];
    return r ? (r.dict_form ?? r.headword) : null;
  }

  // Whitaker lists one word several times (one entry per sense, per governed case): readings
  // that print the same — description, headword, reasons — fold into one row with a count.
  const rows = $derived.by(() => {
    const out = new Map();
    for (const c of block.candidates) {
      const head = headword(c.analysis);
      const key = `${describeAnalysis(c.analysis)}|${head ?? ''}|${c.reasons.join(';')}`;
      const row = out.get(key);
      if (row) row.count += 1;
      else out.set(key, { candidate: c, head, count: 1 });
    }
    return [...out.values()];
  });
</script>

{#if block.candidates.length === 0}
  <p class="none">{t('cand.none')}</p>
{:else}
  <ul class="candidates">
    {#each rows as row, i (i)}
      <li>
        <span class="reading">{describeAnalysis(row.candidate.analysis)}</span>
        {#if row.head}<span class="headword">&lt;{row.head}&gt;</span>{/if}
        {#if row.count > 1}<span class="count">×{row.count}</span>{/if}
        {#if block.pinned}
          <span class="pinned">{t('cand.pinned')}</span>
          <button class="unpin" onclick={() => reader.unpin(index)}>{t('cand.unpin')}</button>
        {:else}
          <button class="pin" onclick={() => reader.pin(index, row.candidate.analysis)}>{t('cand.pin')}</button>
        {/if}
        <ul class="reasons">{#each row.candidate.reasons as r}<li>{reasonText(r, ui.lang)}</li>{/each}</ul>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .candidates { list-style: none; padding: 0; margin: 0; }
  .candidates > li { padding: 6px 0; border-top: 1px solid #ddd; }
  .reading { font-weight: 600; margin-right: 8px; }
  .headword { color: #345; margin-right: 8px; }
  .count { font-size: 0.85em; color: #666; margin-right: 8px; }
  .reasons { margin: 2px 0 0 12px; padding: 0; font-size: 0.85em; color: #555; list-style: '· '; }
  .pinned { font-size: 0.85em; color: #246; margin-right: 6px; }
  .none { color: #666; font-style: italic; }
  button { font-size: 0.8em; }
</style>
