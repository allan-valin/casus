<script>
  /* The stylised overlay Desembarque uses for its readings box (feedback D19): a dimmed
   * backdrop, a centred panel, Escape and a click outside close it. */
  let { onclose, label, panelClass = '', children } = $props();
  let panel = $state(null);
  $effect(() => { panel?.focus(); });
</script>

<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <div class="panel {panelClass}" role="dialog" aria-label={label} tabindex="-1" bind:this={panel}
       onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}>
    <button class="close" onclick={onclose} aria-label="close">×</button>
    {@render children()}
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; z-index: 50; background: rgba(30, 34, 40, 0.42); display: flex; align-items: center; justify-content: center; padding: 16px; }
  .panel { position: relative; background: var(--panel); color: var(--ink); border: 1px solid var(--line); border-radius: 12px; padding: 18px 22px; width: min(560px, 100%); max-height: 88vh; overflow: auto; box-shadow: 0 14px 44px rgba(0,0,0,.3); }
  .panel:focus { outline: none; }
  .close { position: absolute; top: 8px; right: 10px; border: 0; background: none; font-size: 1.4em; cursor: pointer; color: var(--ink-2); line-height: 1; }
</style>
