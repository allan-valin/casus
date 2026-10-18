<script>
  import { withBase } from '../lib/paths.js';
  import { t } from '../lib/i18n.svelte.js';
  /* v1 input (spec §10.1): paste, or one of the bundled passages. Samples sit above the text
   * box and are named as demonstration material; the button says what it does (feedback D9, D10). */
  let { samples = [], onchoose, fetchImpl } = $props();
  let pasted = $state('');
  async function choose(sample) {
    const res = await fetchImpl(withBase(`/samples/${sample.file}`));
    if (!res.ok) return;
    pasted = '';
    onchoose((await res.text()).trim(), sample.era ?? null);
  }
</script>

<div class="picker">
  <div class="samples">
    <span class="samples-label">{t('picker.samples')}</span>
    {#each samples as s (s.id)}
      <button class="sample" onclick={() => choose(s)}>{s.title}</button>
    {/each}
  </div>
  <label class="paste-label" for="paste">{t('picker.paste')}</label>
  <textarea id="paste" rows="5" placeholder={t('picker.placeholder')} bind:value={pasted}></textarea>
  <div class="actions">
    <span class="paste-hint">{t('picker.hint')}</span>
    <button class="read primary" onclick={() => pasted.trim() && onchoose(pasted.trim(), null)} disabled={!pasted.trim()}>{t('picker.read')}</button>
  </div>
</div>

<style>
  .picker { display: flex; flex-direction: column; gap: 10px; }
  .samples { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .samples-label, .paste-label { color: var(--ink-2); font-size: 0.95rem; }
  .paste-label { margin-top: 4px; }
  textarea { width: 100%; box-sizing: border-box; font-family: Georgia, serif; font-size: 1.05rem; line-height: 1.5; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); resize: vertical; }
  .actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .paste-hint { color: var(--muted); font-size: 0.85rem; flex: 1 1 240px; }
  .read { margin-left: auto; }
</style>
