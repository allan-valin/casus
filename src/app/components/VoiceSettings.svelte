<script>
  /* The natural voice of a language (Piper; German: Thorsten). Downloaded only on this click, which says
   * the size; stored by the browser; removable. Nothing loads until the button is pressed. */
  import { t } from '../lib/i18n.svelte.js';
  let { voice, onaction = () => {} } = $props();
  let ready = $state(voice?.naturalReady?.() ?? false);
  let progress = $state(null);
  let error = $state('');
  $effect(() => voice?.onchange?.(() => { ready = voice.naturalReady(); }));
  async function download() {
    error = ''; progress = 0;
    try {
      await voice.downloadNatural((p) => { progress = p; }, { onAttempt: (n, why) => { if (n > 1) onaction('retry', `${n}: ${why}`); } });
      ready = voice.naturalReady(); onaction('downloaded');
    }
    catch (e) { error = e.message; onaction('failed', e.message); }
    finally { progress = null; }
  }
  // a stored voice that misbehaves: clear it and fetch it again (Allan, 2026-10-21)
  async function again() {
    error = '';
    try { await voice.removeNatural(); } catch { /* fetch anyway */ }
    ready = false;
    await download();
  }
  async function remove() {
    error = '';
    try { await voice.removeNatural(); ready = voice.naturalReady(); onaction('removed'); } catch (e) { error = e.message; }
  }
</script>

{#if voice?.natural}
  <div class="field voice-settings">
    <span class="name">{t('voice.natural.heading')}</span>
    <div class="row">
      <span>{t('voice.natural.what', { name: voice.natural.name, size: voice.natural.sizeMB })}</span>
      {#if ready}
        <span class="ok">{t('voice.natural.ready')}</span>
        <button class="again" onclick={again}>{t('voice.natural.again')}</button>
        <button class="remove" onclick={remove}>{t('voice.natural.remove')}</button>
      {:else if progress !== null}
        <progress max="1" value={progress}></progress> <span>{Math.round(progress * 100)} %</span>
      {:else}
        <button class="download" onclick={download}>{t('voice.natural.download', { size: voice.natural.sizeMB })}</button>
      {/if}
    </div>
    <span class="note">{error ? t('voice.natural.failed', { error }) : t('voice.natural.note')}</span>
  </div>
{/if}

<style>
  .field { display: flex; flex-direction: column; gap: 4px; }
  .name { font-weight: 600; font-size: 0.9rem; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .ok { color: #1f6b2f; font-weight: 600; }
  .note { color: var(--muted); font-size: 0.8rem; }
  progress { width: 160px; }
</style>
