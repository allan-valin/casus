<script>
  /*
   * The block pool (spec §7.5, §7.6): one magnetic wrapping pool per selected sentence,
   * full width (feedback D16). A preposition and the object the cascade settled are one
   * glued item with an unglue control (anastrophe is the reader's call); agreement partners
   * light up on hover and drag independently (a soft link).
   */
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import Block from './Block.svelte';
  import { gluePairs, partners, items as poolItems } from '../lib/chunks.js';
  import { blockStyle } from '../lib/colors.js';

  let { reader, onhover, onopen, lemmaOf = null } = $props();
  let hovered = $state(null);
  let sorted = $state(false);        // the pool was last arranged by auto-sort
  const flipDurationMs = 150;

  const blocks = $derived(reader.blocks);
  const byIndex = $derived(new Map(blocks.map((b) => [b.token.index, b])));
  const glue = $derived(gluePairs(blocks, reader.unglued));
  const links = $derived(partners(blocks));
  // the pool's items derive from the reader; while a drag is in flight the library's own
  // (reordered) list overrides them, and the override is dropped once the reader has the move
  const derivedItems = $derived(poolItems(blocks, reader.order, glue));
  let dragging = $state(null);
  const items = $derived(dragging ?? derivedItems);

  const linked = $derived(hovered === null ? new Set() : new Set(links.get(hovered) ?? []));
  const prepositions = $derived(blocks.filter((b) => b.candidates.some((c) => c.analysis.pos === 'prep')).map((b) => b.token.index));
  // counted as the eye sees it: readings that print the same fold into one (colors.js)
  const unresolved = $derived(blocks.filter((b) => blockStyle(b, reader.layers).ambiguous).length);
  const unknown = $derived(blocks.filter((b) => b.candidates.length === 0).length);

  function hover(index) { hovered = index; onhover(index); }
  function consider(e) { dragging = e.detail.items; }
  function finalize(e) {
    const dropped = e.detail.items;
    sorted = false;
    // the reader's order is per token; the whole item (one token or a glued pair)
    // lands at the token position its new slot corresponds to
    const moved = String(e.detail.info.id);
    const position = dropped.findIndex((i) => String(i.id) === moved);
    if (position >= 0) {
      reader.moveItem(dropped[position].indices, dropped.slice(0, position).reduce((n, i) => n + i.indices.length, 0));
    }
    dragging = null;
  }
</script>

<div class="controls">
  <span class="group-label">Arrange</span>
  <button class="restore" title="put every block back in the order of the text" onclick={() => { reader.restoreOrder(); sorted = false; }}>restore original order</button>
  <button class="autosort" title="group blocks by case, each group in text order" onclick={() => { reader.autoSort(); sorted = true; }}>auto-sort by case</button>
  {#if sorted}<span class="sort-note" aria-live="polite">sorted by case; an ambiguous block goes by its first reading</span>{/if}
  <span class="count" aria-live="polite">{blocks.length} words · {unresolved} ambiguous{unknown ? ` · ${unknown} not in the dictionary` : ''}</span>
</div>

<div class="pool" use:dndzone={{ items, flipDurationMs, dropTargetStyle: {}, delayTouchStart: 150 }} onconsider={consider} onfinalize={finalize}>
  {#each items as item (item.id)}
    <div class="item" class:chunk={item.indices.length > 1} animate:flip={{ duration: flipDurationMs }}>
      {#each item.indices as index, i (index)}
        {@const block = byIndex.get(index)}
        {#if block}
          <span class="block" class:linked={linked.has(index)}>
            <Block {block} layers={reader.layers} onhover={hover} {onopen} {lemmaOf} />
          </span>
          {#if item.indices.length > 1 && i === 0}
            <button class="unglue" title="unglue: let the preposition and its object move apart" aria-label="unglue this chunk" onclick={() => reader.toggleGlue(index)}>⛓</button>
          {:else if item.indices.length === 1 && reader.unglued.has(index) && prepositions.includes(index)}
            <button class="glue" title="glue to the next word again" aria-label="glue to the next word" onclick={() => reader.toggleGlue(index)}>⛓</button>
          {/if}
        {/if}
      {/each}
    </div>
  {/each}
</div>

<style>
  .controls { display: flex; gap: 8px; margin-bottom: 10px; align-items: center; flex-wrap: wrap; }
  .group-label { color: var(--ink-2); font-size: 0.9rem; font-weight: 600; }
  .sort-note { font-size: 0.8em; color: var(--muted); }
  .count { margin-left: auto; font-size: 0.85em; color: var(--muted); }
  .pool { display: flex; flex-wrap: wrap; gap: 10px 12px; min-height: 90px; padding: 14px; border: 1.5px dashed var(--line); border-radius: 10px; background: var(--panel); width: 100%; box-sizing: border-box; }
  .item { display: inline-flex; align-items: center; gap: 2px; }
  .chunk { outline: 2px solid #357; outline-offset: 3px; border-radius: 14px; padding: 2px; }
  .block.linked :global(.pill) { box-shadow: 0 0 0 3px #ffd54a; }
  .unglue, .glue { border: 0; background: none; cursor: pointer; font-size: 0.9em; opacity: 0.7; }
</style>
