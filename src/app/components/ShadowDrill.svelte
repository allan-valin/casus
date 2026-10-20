<script>
  /* Shadowing (drills research 2026-10-20, item 13; Hamada 2016): a sentence is shown and spoken; the learner records
   * themself saying it and plays both back to compare. The recording stays in this page; nothing is uploaded. */
  import { t } from '../lib/i18n.svelte.js';
  let { sentences, voice = null, lang, random = Math.random } = $props();
  const order = (() => { const a = [...sentences]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  let k = $state(0);
  let recorder = $state(null);
  let url = $state(null);
  const canRecord = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const current = $derived(order[k % Math.max(1, order.length)] ?? null);
  async function play() { try { await voice?.speak(current.text); } catch { /* no voice */ } }
  async function record() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => { stream.getTracks().forEach((tr) => tr.stop()); if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })); recorder = null; };
    rec.start();
    recorder = rec;
  }
  function next() { k += 1; if (url) URL.revokeObjectURL(url); url = null; }
</script>

{#if current}
  <div class="shadow-drill">
    <p class="shadow-text" lang={lang.bcp47} dir="auto">{current.text}</p>
    {#if current.en}<p class="muted">{current.en}</p>{/if}
    <p class="buttons">
      <button class="shadow-play primary" onclick={play} disabled={!voice}>🔊 {t('shadow.play')}</button>
      {#if recorder}<button class="shadow-stop" onclick={() => recorder.stop()}>⏹ {t('shadow.stop')}</button>
      {:else}<button class="shadow-record" onclick={record} disabled={!canRecord}>🎙 {t('shadow.record')}</button>{/if}
      <button class="next" onclick={next}>{t('shadow.next')}</button>
    </p>
    {#if !canRecord}<p class="muted">{t('shadow.nomic')}</p>{/if}
    {#if url}<p>{t('shadow.mine')}: <audio controls src={url}></audio></p>{/if}
  </div>
{:else}<p class="muted">{t('more.none')}</p>{/if}

<style>
  .shadow-text { font-size: 1.4em; }
  .buttons { display: flex; gap: 8px; flex-wrap: wrap; }
  .muted { color: var(--ink-2); }
</style>
