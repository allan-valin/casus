<script>
  /* One button that shows the current choice and opens the list of choices (Allan, 2026-10-22: drill types, Learn and
   * Conversation levels took several rows on a phone). A native <details>, so the choices stay in the page and work
   * without script; picking one, or clicking anywhere outside, closes it. */
  let { label = '', head = null, cls = '', title = '', children } = $props();
  let box;
  function pick(e) { if (e.target.closest('button, a')) box.open = false; }
  $effect(() => {
    const away = (e) => { if (box?.open && !box.contains(e.target)) box.open = false; };
    document.addEventListener('click', away);
    return () => document.removeEventListener('click', away);
  });
</script>

<details class="picker {cls}" bind:this={box}>
  <summary {title}><span class="picker-label">{#if head}{@render head()}{:else}{label}{/if}</span> <span class="caret" aria-hidden="true">▾</span></summary>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="menu" onclick={pick}>{@render children()}</div>
</details>

<style>
  .picker { position: relative; display: inline-block; }
  summary { list-style: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; padding: 0 14px; border: 1.5px solid var(--accent); border-radius: 8px; background: var(--panel); color: var(--ink); font-weight: 600; height: var(--control-h); box-sizing: border-box; }
  summary::-webkit-details-marker { display: none; }
  .picker[open] summary { background: color-mix(in srgb, var(--accent) 14%, var(--panel)); }
  .caret { font-size: 0.8em; transition: transform .15s; }
  .picker[open] .caret { transform: rotate(180deg); }
  .menu { position: absolute; z-index: 40; top: calc(100% + 4px); inset-inline-start: 0; min-width: 220px; max-width: min(92vw, 520px); max-height: 70vh; overflow: auto;
    display: flex; flex-direction: column; gap: 2px; padding: 6px; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.18); }
  .menu :global(button), .menu :global(a) { min-height: var(--control-h); box-sizing: border-box; display: flex; align-items: center; text-align: start; justify-content: flex-start; width: 100%; border-radius: 6px; }
</style>
