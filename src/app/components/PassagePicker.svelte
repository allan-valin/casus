<script>
  import { withBase } from '../lib/paths.js';
  import { t } from '../lib/i18n.svelte.js';
  import { readTextFile, ACCEPT } from '../lib/upload.js';
  /* v1 input (spec §10.1): paste, or one of the bundled passages. Samples sit above the text
   * box and are named as demonstration material; the button says what it does (feedback D9, D10). */
  import { onMount } from 'svelte';
  let { samples = [], onchoose, fetchImpl, samplesPath = '/samples/la', onerror = () => {}, language = 'Latin',
    storage = null, code = 'la', schedule = (fn, ms) => setTimeout(fn, ms), onsay = () => {},
    location: loc = typeof window !== 'undefined' ? window.location : null,
    replaceHash = () => { try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch { /* no history */ } },
    channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('casus') : null,
    closeWindow = () => { try { window.close(); } catch { /* not ours to close */ } }, handoffMs = 400 } = $props();
  // the text box is remembered per language (Allan, 2026-10-19: what I typed is there next time)
  const KEY = `casus:input:${code}`;
  let timer = null;
  function remember(text) {
    if (!storage) return;
    clearTimeout(timer);
    timer = schedule(() => { try { storage.setItem(KEY, text); } catch { /* storage full or blocked */ } }, 400);
  }
  // text sent by the bookmarklet arrives as #append=<text>&from=<site>, added at the bottom
  function append(add, site) {
    pasted = pasted.trim() ? `${pasted.trimEnd()}\n\n${add}` : add;
    remember(pasted);
    onsay('act.appended', { site, chars: [...add].length });
  }
  // a Casus tab already open for this language takes the text, and the tab the bookmark opened closes itself
  // (a site cannot reach a tab the reader opened, so the bookmark opens a new one)
  if (channel) {
    channel.addEventListener('message', (e) => {
      const m = e.data ?? {};
      if (m.type === 'append' && m.code === code && !m.mine) { append(m.text, m.site); channel.postMessage({ type: 'taken', id: m.id }); }
    });
  }
  function takeAppend() {
    const hash = loc?.hash ?? '';
    if (!hash.startsWith('#append=')) return;
    const params = new URLSearchParams(hash.slice(1));
    const add = (params.get('append') ?? '').trim();
    const site = params.get('from') ?? '';
    replaceHash();
    if (!add) return;
    if (!channel) { append(add, site); return; }
    const id = `${Date.now()}-${Math.random()}`;
    let taken = false;
    channel.addEventListener('message', (e) => { if (e.data?.type === 'taken' && e.data.id === id) taken = true; });
    channel.postMessage({ type: 'append', code, text: add, site, id });
    setTimeout(() => { if (taken) closeWindow(); else append(add, site); }, handoffMs);
  }
  onMount(() => {
    try { pasted = storage?.getItem(KEY) ?? ''; } catch { /* blocked */ }
    takeAppend();
    const onHash = () => takeAppend();
    // the proofreading tab edits the same text: mirror it here (Allan, 2026-10-19)
    const onStorage = (e) => { if (e.key === KEY && e.newValue !== null && e.newValue !== pasted) pasted = e.newValue; };
    window.addEventListener?.('hashchange', onHash);
    window.addEventListener?.('storage', onStorage);
    return () => { window.removeEventListener?.('hashchange', onHash); window.removeEventListener?.('storage', onStorage); };
  });
  async function upload(e) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = (await readTextFile(file)).trim();
      if (text) { pasted = text; remember(text); onchoose(text, null); }
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
    <label class="paste-label" for="paste">{t('picker.paste', { language })}</label>
    <label class="upload" title={t('picker.upload.title')}>{t('picker.upload')}<input type="file" accept={ACCEPT} onchange={upload}></label>
  </div>
  <textarea id="paste" rows="5" dir="auto" placeholder={t('picker.placeholder')} bind:value={pasted} oninput={() => remember(pasted)}></textarea>
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
  .upload { display: inline-flex; align-items: center; padding: 6px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); cursor: pointer; font-size: 0.92rem; min-height: var(--control-h); box-sizing: border-box; }
  .upload:hover, .upload:focus-within { border-color: var(--accent); }
  .upload input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  textarea { width: 100%; box-sizing: border-box; font-family: Georgia, serif; font-size: 1.05rem; line-height: 1.5; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); resize: vertical; }
  .actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .paste-hint { color: var(--muted); font-size: 0.85rem; flex: 1 1 240px; }
  .read { margin-left: auto; }
</style>
