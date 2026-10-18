<script>
  import { withBase } from '../lib/paths.js';
  import { t } from '../lib/i18n.svelte.js';
  import { readTextFile } from '../lib/upload.js';
  /* v1 input (spec §10.1): paste, or one of the bundled passages. Samples sit above the text
   * box and are named as demonstration material; the button says what it does (feedback D9, D10). */
  let { samples = [], onchoose, fetchImpl, samplesPath = '/samples/la', onerror = () => {} } = $props();
  async function upload(e) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = (await readTextFile(file)).trim();
      if (text) { pasted = text; onchoose(text, null); }
    } catch (err) { onerror(err.message); }
    try { input.value = ''; } catch { /* a test's files stub */ }
  }
  let pasted = $state('');
  async function choose(sample) {
    const res = await fetchImpl(withBase(`${samplesPath}/${sample.file}`));
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
  <div class="paste-row">
    <label class="paste-label" for="paste">{t('picker.paste')}</label>
    <label class="upload" title={t('picker.upload.title')}>{t('picker.upload')}<input type="file" accept=".txt,.md,text/plain,text/markdown" onchange={upload}></label>
  </div>
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
  .paste-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
  .upload { display: inline-flex; align-items: center; padding: 6px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); cursor: pointer; font-size: 0.92rem; min-height: 36px; box-sizing: border-box; }
  .upload:hover, .upload:focus-within { border-color: var(--accent); }
  .upload input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  textarea { width: 100%; box-sizing: border-box; font-family: Georgia, serif; font-size: 1.05rem; line-height: 1.5; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); resize: vertical; }
  .actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .paste-hint { color: var(--muted); font-size: 0.85rem; flex: 1 1 240px; }
  .read { margin-left: auto; }
</style>
