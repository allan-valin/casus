<script>
  /* 🔊 for a word. The tier is known without downloading anything; espeak-ng loads on the first click.
   * A failure is said in visible text (touch screens have no tooltips) and reported to the log; the
   * button stays usable so a retry is possible. */
  import { t } from '../lib/i18n.svelte.js';
  let { text, voice, onspoke = () => {} } = $props();
  let tier = $state(undefined);
  let busy = $state(false);
  let failed = $state(false);
  let fellBack = $state(false);
  $effect(() => {
    const ask = () => voice?.tier().then((x) => { tier = x; });
    ask();
    return voice?.onchange?.(ask);
  });
  const title = $derived(tier === undefined ? t('voice.loading') : tier === null ? t('voice.none') : busy && tier === 'espeak' ? t('voice.loadingEspeak') : t(`voice.tier.${tier}`));
  async function say() {
    busy = true; failed = false; fellBack = false;
    try { const r = await voice.speak(text); fellBack = !!r?.fellBack; onspoke(r?.tier ?? tier); } catch { failed = true; onspoke(null); } finally { busy = false; voice?.tier().then((x) => { tier = x; }); }
  }
</script>

<button class="speaker" disabled={!voice || tier === null || busy} {title} aria-label={title} onclick={say}>{busy ? '…' : '🔊'}</button>
{#if tier === null || failed}<span class="voice-note">{t('voice.none')}</span>{:else if fellBack}<span class="voice-note">{t('voice.natural.fellBack')}</span>{/if}

<style>
  .speaker { min-height: 30px; padding: 2px 8px; font-size: 1rem; margin-left: 6px; vertical-align: middle; }
  .voice-note { font-size: 0.75rem; color: var(--muted); margin-left: 6px; }
</style>
