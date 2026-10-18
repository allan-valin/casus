<script>
  import { withBase } from '../lib/paths.js';
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
    <span class="samples-label">Demonstration samples (short public-domain passages):</span>
    {#each samples as s (s.id)}
      <button class="sample" onclick={() => choose(s)}>{s.title}</button>
    {/each}
  </div>
  <label class="paste-label" for="paste">Or paste your own Latin text</label>
  <textarea id="paste" rows="5" placeholder="Paste Latin here — a sentence, a paragraph, a page." bind:value={pasted}></textarea>
  <div class="actions">
    <span class="paste-hint">Sentences are split on . ? ! — then every word is looked up and its case worked out.</span>
    <button class="read primary" onclick={() => pasted.trim() && onchoose(pasted.trim(), null)} disabled={!pasted.trim()}>Identify grammar</button>
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
