<script>
  import { describeAnalysis } from '../lib/colors.js';
  let { block, reader } = $props();
  const index = $derived(block.token.index);
</script>

{#if block.candidates.length === 0}
  <p class="none">not in lexicon</p>
{:else}
  <ul class="candidates">
    {#each block.candidates as c, i (i)}
      <li>
        <span class="reading">{describeAnalysis(c.analysis)}</span>
        {#if block.pinned}
          <span class="pinned">pinned</span>
          <button class="unpin" onclick={() => reader.unpin(index)}>unpin</button>
        {:else}
          <button class="pin" onclick={() => reader.pin(index, c.analysis)}>pin</button>
        {/if}
        <ul class="reasons">{#each c.reasons as r}<li>{r}</li>{/each}</ul>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .candidates { list-style: none; padding: 0; margin: 0; }
  .candidates > li { padding: 6px 0; border-top: 1px solid #ddd; }
  .reading { font-weight: 600; margin-right: 8px; }
  .reasons { margin: 2px 0 0 12px; padding: 0; font-size: 0.85em; color: #555; list-style: '· '; }
  .pinned { font-size: 0.85em; color: #246; margin-right: 6px; }
  .none { color: #666; font-style: italic; }
  button { font-size: 0.8em; }
</style>
