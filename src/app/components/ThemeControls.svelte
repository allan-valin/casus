<script>
  /* Light or dark, and the page's colours: the language's flags or the Casus purple (Allan, 2026-10-20). */
  import { themesFor, pickTheme, pickMode, applyTheme, themeKey, MODE_KEY, flagUrl } from '../lib/theme.js';
  import { t, ui } from '../lib/i18n.svelte.js';
  let { code, storage = null } = $props();
  const themes = $derived(themesFor(code));
  let mode = $state(pickMode(storage));
  let themeId = $state(pickTheme(code, storage).id);
  const theme = $derived(themes.find((x) => x.id === themeId) ?? themes[0]);
  $effect(() => { applyTheme(mode, theme); });
  function toggle() {
    mode = mode === 'dark' ? 'light' : 'dark';
    try { storage?.setItem(MODE_KEY, mode); } catch { /* not kept */ }
  }
  function choose(id) {
    themeId = id;
    try { storage?.setItem(themeKey(code), id); } catch { /* not kept */ }
  }
</script>

<div class="theme-controls">
  <button class="mode" onclick={toggle} title={t(mode === 'dark' ? 'theme.light' : 'theme.dark')} aria-label={t(mode === 'dark' ? 'theme.light' : 'theme.dark')}>{mode === 'dark' ? '☀' : '☾'}</button>
  <label class="palette-box" title={t('theme.palette')}>
    {#if flagUrl(theme.flag)}<img class="flag" src={flagUrl(theme.flag)} alt="" />{:else}<span class="dot"></span>{/if}
    <select class="palette" value={themeId} onchange={(e) => choose(e.currentTarget.value)} aria-label={t('theme.palette')}>
      {#each themes as x (x.id)}<option value={x.id}>{x.name[ui.lang] ?? x.name.en}</option>{/each}
    </select>
  </label>
</div>

<style>
  .theme-controls { display: inline-flex; align-items: center; gap: 6px; }
  .mode { width: 38px; height: 38px; border-radius: 50%; padding: 0; font-size: 1.1rem; }
  .palette-box { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line); border-radius: 8px; padding: 0 0 0 8px; background: var(--panel); }
  .palette-box select { border: 0; background: transparent; }
  .flag { width: 22px; height: 16px; border-radius: 2px; box-shadow: 0 0 0 1px var(--line); }
  .dot { width: 14px; height: 14px; border-radius: 50%; background: var(--accent); }
</style>
