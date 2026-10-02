<script>
  /*
   * The right pane (spec §7.5, §7.6): one magnetic wrapping pool per selected
   * sentence. A preposition and the object the cascade settled are one glued
   * item with an unglue control (anastrophe is the reader's call); agreement
   * partners light up on hover and drag independently (a soft link).
   */
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import Block from './Block.svelte';
  import { gluePairs, partners, items as poolItems } from '../lib/chunks.js';

  let { reader, onhover, onopen, lemmaOf = null } = $props();
  let hovered = $state(null);
  let sorted = $state(false);        // the pool was last arranged by auto-sort
  const flipDurationMs = 150;

  const blocks = $derived(reader.blocks);
  const byIndex = $derived(new Map(blocks.map((b) => [b.token.index, b])));
  const glue = $derived(gluePairs(blocks, reader.unglued));
  const links = $derived(partners(blocks));
  // the pool's items; dndzone needs a stable `id` per item and a writable list
  let items = $state([]);
  $effect(() => { items = poolItems(blocks, reader.order, glue); });

  const linked = $derived(hovered === null ? new Set() : new Set(links.get(hovered) ?? []));
  const prepositions = $derived(blocks.filter((b) => b.candidates.some((c) => c.analysis.pos === 'prep')).map((b) => b.token.index));

  function hover(index) { hovered = index; onhover(index); }
  function consider(e) { items = e.detail.items; }
  function finalize(e) {
    items = e.detail.items;
    sorted = false;
    // the reader's order is per token; the whole item (one token or a glued pair)
    // lands at the token position its new slot corresponds to
    const moved = String(e.detail.info.id);
    const position = items.findIndex((i) => String(i.id) === moved);
    if (position < 0) return;
    const indices = items[position].indices;
    reader.moveItem(indices, items.slice(0, position).reduce((n, i) => n + i.indices.length, 0));
  }
</script>

<div class="controls">
  <button class="restore" onclick={() => { reader.restoreOrder(); sorted = false; }}>restore original order</button>
  <button class="autosort" onclick={() => { reader.autoSort(); sorted = true; }}>auto-sort by case</button>
  {#if sorted}<span class="sort-note" aria-live="polite">sorted by case; an ambiguous block goes by its first reading</span>{/if}
</div>

<div class="pool" use:dndzone={{ items, flipDurationMs, dropTargetStyle: {} }} onconsider={consider} onfinalize={finalize}>
  {#each items as item (item.id)}
    <div class="item" class:chunk={item.indices.length > 1} animate:flip={{ duration: flipDurationMs }}>
      {#each item.indices as index, i (index)}
        {@const block = byIndex.get(index)}
        {#if block}
          <span class="block" class:linked={linked.has(index)}>
            <Block {block} layers={reader.layers} onhover={hover} {onopen} {lemmaOf} />
          </span>
          {#if item.indices.length > 1 && i === 0}
            <button class="unglue" title="unglue" aria-label="unglue this chunk" onclick={() => reader.toggleGlue(index)}>⛓</button>
          {:else if item.indices.length === 1 && reader.unglued.has(index) && prepositions.includes(index)}
            <button class="glue" title="glue to the next word" aria-label="glue to the next word" onclick={() => reader.toggleGlue(index)}>⛓</button>
          {/if}
        {/if}
      {/each}
    </div>
  {/each}
</div>

<style>
  .controls { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; flex-wrap: wrap; }
  .sort-note { font-size: 0.8em; color: #555; }
  .pool { display: flex; flex-wrap: wrap; gap: 8px; min-height: 60px; padding: 8px; border: 1px dashed #bbb; border-radius: 8px; }
  .item { display: inline-flex; align-items: center; gap: 2px; }
  .chunk { outline: 2px solid #357; outline-offset: 2px; border-radius: 14px; padding: 2px; }
  .block.linked :global(.pill) { box-shadow: 0 0 0 3px #ffd54a; }
  .unglue, .glue { border: 0; background: none; cursor: pointer; font-size: 0.9em; opacity: 0.7; }
</style>
