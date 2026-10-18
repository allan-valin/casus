<script>
  /*
   * The block pool (spec §7.5, §7.6): one wrapping pool per selected sentence, full width
   * (feedback D16). Drag is caret-preview (feedback D17): the blocks stay where they are
   * while the reader aims, a ghost follows the pointer, a caret marks the gap, and the move
   * happens on release. A preposition and the object the cascade settled are one glued item
   * with an unglue control; agreement partners light up on hover and drag independently.
   * Keyboard: Alt+ArrowLeft / Alt+ArrowRight move the focused block one slot.
   */
  import Block from './Block.svelte';
  import { gluePairs, partners, items as poolItems } from '../lib/chunks.js';
  import { blockStyle as latinBlockStyle } from '../lib/colors.js';
  import { createDrag, tokenOffset } from '../lib/drag.js';
  import { WORD_ORDERS } from '../lib/order.js';
  import { t } from '../lib/i18n.svelte.js';

  let { reader, onhover, onopen, lemmaOf = null } = $props();
  let hovered = $state(null);
  let sorted = $state(false);        // the pool was last arranged by auto-sort
  let pattern = $state(null);        // the word order last applied (SVO…)
  let pool = $state(null);

  const blocks = $derived(reader.blocks);
  const byIndex = $derived(new Map(blocks.map((b) => [b.token.index, b])));
  const glue = $derived(gluePairs(blocks, reader.unglued));
  const links = $derived(partners(blocks));
  const items = $derived(poolItems(blocks, reader.order, glue));

  const linked = $derived(hovered === null ? new Set() : new Set(links.get(hovered) ?? []));
  const prepositions = $derived(blocks.filter((b) => b.candidates.some((c) => c.analysis.pos === 'prep')).map((b) => b.token.index));
  // counted as the eye sees it: readings that print the same fold into one (colors.js)
  const colors = $derived(reader.colors ?? null);
  const unresolved = $derived(blocks.filter((b) => (colors?.blockStyle ?? latinBlockStyle)(b, reader.layers).ambiguous).length);
  const unknown = $derived(blocks.filter((b) => b.candidates.length === 0).length);

  function hover(index) { hovered = index; onhover(index); }

  // ---- drag -------------------------------------------------------------
  const itemEls = () => (pool ? [...pool.querySelectorAll('.item')] : []);
  const drag = createDrag({ threshold: 6, holdMs: 220, rects: () => itemEls().map((el) => el.getBoundingClientRect()) });
  let lifting = $state(null);        // position of the item being dragged
  let caret = $state(null);          // { x, y, height } relative to the pool
  let ghost = $state(null);          // { html, x, y }
  let holdTimer = null;
  let suppressClick = false;

  let pointerId = null;
  function sync(r) {
    if (!r.dragging) { lifting = null; caret = null; ghost = null; return; }
    // capture only once a drag is real: capturing on pointerdown retargets the click to the pool
    // and the pill's own click (the dictionary) never fires
    if (lifting === null) { try { pool.setPointerCapture(pointerId); } catch { /* jsdom */ } }
    lifting = r.item;
    const p = pool.getBoundingClientRect();
    caret = r.caret ? { x: r.caret.x - p.left, y: r.caret.y - p.top, height: r.caret.height } : null;
    ghost = { ...(ghost ?? { html: itemEls()[r.item]?.innerHTML ?? '' }), x: drag.state.x, y: drag.state.y };
  }
  function down(e, position) {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('button')) return;                       // ⛓ is a button, not a handle
    drag.down({ item: position, x: e.clientX, y: e.clientY, pointerType: e.pointerType, at: e.timeStamp });
    pointerId = e.pointerId;
    clearTimeout(holdTimer);
    if (e.pointerType === 'touch') holdTimer = setTimeout(() => sync(drag.hold({ at: performance.now() })), 230);
  }
  function move(e) {
    if (drag.state.item === null) return;
    sync(drag.move({ x: e.clientX, y: e.clientY, at: e.timeStamp }));
  }
  function up(e) {
    clearTimeout(holdTimer);
    const was = drag.state.dragging;
    const r = drag.up({ x: e.clientX, y: e.clientY });
    sync({ dragging: false });
    if (!r) return;
    if (was) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); }
    const moving = items[r.item];
    if (!moving) return;
    sorted = false; pattern = null;
    reader.moveItem(moving.indices, tokenOffset(items, r.gap, moving.id));
  }
  function cancel() { clearTimeout(holdTimer); drag.cancel(); sync({ dragging: false }); }
  // while a touch drag is on, the page must not scroll under the finger
  $effect(() => {
    if (typeof window === 'undefined') return;
    const block = (e) => { if (drag.state.dragging) e.preventDefault(); };
    const esc = (e) => { if (e.key === 'Escape' && drag.state.item !== null) cancel(); };
    window.addEventListener('touchmove', block, { passive: false });
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('touchmove', block); window.removeEventListener('keydown', esc); };
  });
  function open(b) { if (!suppressClick) onopen(b); }

  function keyMove(e, position) {
    if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const gap = e.key === 'ArrowLeft' ? position - 1 : position + 2;
    if (gap < 0 || gap > items.length) return;
    const moving = items[position];
    sorted = false; pattern = null;
    reader.moveItem(moving.indices, tokenOffset(items, gap, moving.id));
  }
</script>

<div class="controls">
  <span class="group-label">{t('pane.arrange')}</span>
  <button class="restore" title={t('pane.restore.title')} onclick={() => { reader.restoreOrder(); sorted = false; pattern = null; }}>{t('pane.restore')}</button>
  <button class="autosort" title={t('pane.autosort.title')} onclick={() => { reader.autoSort(); sorted = true; pattern = null; }}>{t('pane.autosort')}</button>
  <span class="group-label order-label" title={t('pane.wordorder.title')}>{t('pane.wordorder')}</span>
  {#each WORD_ORDERS as p (p)}
    <button class="word-order" class:active={pattern === p} title={t('pane.wordorder.title')}
            onclick={() => { reader.arrange(p); pattern = p; sorted = false; }}>{p}</button>
  {/each}
  {#if sorted}<span class="sort-note" aria-live="polite">{t('pane.sorted')}</span>{/if}
  {#if pattern}<span class="sort-note" aria-live="polite">{t('pane.arranged', { pattern, roles: [...pattern].map((r) => t(`pane.role.${r}`)).join(' → ') })}</span>{/if}
  <span class="count" aria-live="polite">{t('pane.count', { words: blocks.length, ambiguous: unresolved })}{unknown ? t('pane.count.unknown', { n: unknown }) : ''}</span>
</div>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="pool" class:dragging={lifting !== null} bind:this={pool}
     onpointermove={move} onpointerup={up} onpointercancel={cancel}>
  {#each items as item, position (item.id)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="item" class:chunk={item.indices.length > 1} class:lifting={lifting === position}
         onpointerdown={(e) => down(e, position)} onkeydown={(e) => keyMove(e, position)}>
      {#each item.indices as index, i (index)}
        {@const block = byIndex.get(index)}
        {#if block}
          <span class="block" class:linked={linked.has(index)} class:hovered={hovered === index}>
            <Block {block} layers={reader.layers} onhover={hover} onopen={open} {lemmaOf} {colors} />
          </span>
          {#if item.indices.length > 1 && i === 0}
            <button class="unglue" title={t('pane.unglue')} aria-label="unglue this chunk" onclick={() => reader.toggleGlue(index)}>⛓</button>
          {:else if item.indices.length === 1 && reader.unglued.has(index) && prepositions.includes(index)}
            <button class="glue" title={t('pane.glue')} aria-label="glue to the next word" onclick={() => reader.toggleGlue(index)}>⛓</button>
          {/if}
        {/if}
      {/each}
    </div>
  {/each}
  {#if caret}<div class="caret" style:left="{caret.x}px" style:top="{caret.y}px" style:height="{caret.height}px" aria-hidden="true"></div>{/if}
</div>
{#if ghost}
  <div class="ghost" style:left="{ghost.x}px" style:top="{ghost.y}px" aria-hidden="true">{@html ghost.html}</div>
{/if}
<p class="drag-hint">{t('pane.draghint')}</p>

<style>
  .controls { display: flex; gap: 8px; margin-bottom: 10px; align-items: center; flex-wrap: wrap; }
  .group-label { color: var(--ink-2); font-size: 0.9rem; font-weight: 600; }
  .sort-note { font-size: 0.8em; color: var(--muted); flex-basis: 100%; }
  .order-label { margin-left: 8px; }
  .word-order { padding: 4px 8px; min-height: 32px; font-variant: small-caps; letter-spacing: 0.04em; }
  .word-order.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .count { margin-left: auto; font-size: 0.85em; color: var(--muted); }
  .pool { position: relative; display: flex; flex-wrap: wrap; gap: 10px 12px; min-height: 90px; padding: 14px; border: 1.5px dashed var(--line); border-radius: 10px; background: var(--panel); width: 100%; box-sizing: border-box; }
  .pool.dragging { cursor: grabbing; }
  .pool.dragging :global(.pill) { cursor: grabbing; }
  .item { display: inline-flex; align-items: center; gap: 2px; }
  .item.lifting { opacity: 0.35; }
  .chunk { outline: 2px solid #357; outline-offset: 3px; border-radius: 14px; padding: 2px; }
  .block.hovered :global(.pill) { box-shadow: 0 0 0 3px var(--accent); }
  .block.linked :global(.pill) { box-shadow: 0 0 0 3px #ffd54a; }
  .block.linked.hovered :global(.pill) { box-shadow: 0 0 0 3px var(--accent), 0 0 0 6px #ffd54a; }
  .unglue, .glue { border: 0; background: none; cursor: pointer; font-size: 0.9em; opacity: 0.7; min-height: 0; padding: 2px 4px; }
  .caret { position: absolute; width: 3px; margin-left: -1px; background: var(--accent); border-radius: 2px; box-shadow: 0 0 0 2px var(--panel); pointer-events: none; }
  .ghost { position: fixed; z-index: 60; transform: translate(-50%, -50%) rotate(-2deg); opacity: 0.9; pointer-events: none; display: inline-flex; gap: 2px; filter: drop-shadow(0 6px 10px rgba(0,0,0,.25)); }
  .drag-hint { margin: 8px 0 0; color: var(--muted); font-size: 0.82rem; }
</style>
