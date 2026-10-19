<script>
  /* Downloads (Allan, 2026-10-19): keep a language's dictionary on this device for offline reading, see what is kept,
   * remove it; and the Wiktionary answers kept for the current language. */
  import { onMount } from 'svelte';
  import { LANGUAGES, getLanguage } from '../../lang/registry.js';
  import { withBase } from '../lib/paths.js';
  import { t, ui } from '../lib/i18n.svelte.js';
  import { downloadLanguage, removeLanguage, cacheName, liveEntries, clearLive } from '../lib/offline.js';
  let { fetchImpl, caches = typeof window !== 'undefined' ? window.caches : null, storage = null, current, onsay = () => {} } = $props();

  let rows = $state(LANGUAGES.map((l) => ({ code: l.code, name: l.name, bytes: null, saved: false, progress: null })));
  let liveCount = $state(storage ? liveEntries(storage, current) : 0);
  const mb = (b) => (b == null ? '…' : `${(b / 1e6).toFixed(1)} MB`);
  const base = (code) => withBase(getLanguage(code).dataPath);
  const row = (code) => rows.find((r) => r.code === code);

  onMount(async () => {
    for (const r of rows) {
      fetchImpl(`${base(r.code)}/manifest.json`).then((res) => (res.ok ? res.json() : null)).then((m) => { row(r.code).bytes = m?.total_bytes ?? null; }).catch(() => {});
      if (caches) caches.has(cacheName(r.code)).then((has) => { row(r.code).saved = has; }).catch(() => {});
    }
  });

  async function get(code) {
    if (!caches) { onsay('act.dl.unsupported'); return; }
    const r = row(code);
    r.progress = 0;
    onsay('act.dl.start', { lang: r.name[ui.lang] ?? r.name.en });
    try {
      await downloadLanguage({ code, base: base(code), fetchImpl, caches, onProgress: (done, total) => { r.progress = Math.round((100 * done) / total); } });
      r.saved = true;
      onsay('act.dl.done', { lang: r.name[ui.lang] ?? r.name.en });
    } catch (e) {
      onsay('act.dl.failed', { error: e.message });
    }
    r.progress = null;
  }
  async function remove(code) {
    await removeLanguage({ code, caches });
    row(code).saved = false;
    onsay('act.dl.removed', { lang: row(code).name[ui.lang] ?? row(code).name.en });
  }
  function forget() {
    const n = clearLive(storage, current);
    liveCount = 0;
    onsay('act.live.cleared', { n });
  }
</script>

<details class="downloads">
  <summary>{t('dl.heading')}</summary>
  <p class="dl-hint">{t('dl.hint')}</p>
  <ul>
    {#each rows as r (r.code)}
      <li class="dl-row" data-code={r.code}>
        <span class="name">{r.name[ui.lang] ?? r.name.en}</span>
        <span class="size">{mb(r.bytes)}</span>
        <span class="dl-state">{r.progress != null ? `${r.progress}%` : r.saved ? t('dl.saved') : t('dl.online')}</span>
        {#if r.progress != null}<progress max="100" value={r.progress}></progress>
        {:else if r.saved}<button class="dl-remove" onclick={() => remove(r.code)}>{t('dl.remove')}</button>
        {:else}<button class="dl-get" onclick={() => get(r.code)}>{t('dl.get')}</button>{/if}
      </li>
    {/each}
  </ul>
  {#if storage}
    <p class="live">{t('dl.live', { n: liveCount })} {#if liveCount}<button class="dl-forget" onclick={forget}>{t('dl.forget')}</button>{/if}</p>
  {/if}
</details>

<style>
  .downloads { margin-top: 10px; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; background: var(--panel); }
  summary { cursor: pointer; font-weight: 600; }
  .dl-hint { color: var(--ink-2); font-size: 0.9em; margin: 6px 0; }
  ul { list-style: none; padding: 0; margin: 0; }
  .dl-row { display: grid; grid-template-columns: 1fr auto auto auto; gap: 4px 10px; align-items: center; padding: 3px 0; border-top: 1px solid var(--line-soft); }
  .size, .dl-state { color: var(--ink-2); font-size: 0.9em; white-space: nowrap; }
  button { font: inherit; font-size: 0.9em; padding: 2px 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); color: var(--ink); cursor: pointer; }
  progress { width: 80px; }
  .live { font-size: 0.9em; color: var(--ink-2); }
</style>
