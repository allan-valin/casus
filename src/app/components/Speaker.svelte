<script>
  /* 🔊 for a word: the voice decides its tier once; with none, the button is disabled and says so. */
  import { t } from '../lib/i18n.svelte.js';
  let { text, voice, onspoke = () => {} } = $props();
  let tier = $state(undefined);
  let busy = $state(false);
  $effect(() => { voice?.tier().then((x) => { tier = x; }); });
  const title = $derived(tier === undefined ? t('voice.loading') : tier === null ? t('voice.none') : t(`voice.tier.${tier}`));
  async function say() {
    busy = true;
    try { await voice.speak(text); onspoke(tier); } catch { tier = null; } finally { busy = false; }
  }
</script>

<button class="speaker" disabled={!voice || tier === null || busy} {title} aria-label={title} onclick={say}>🔊</button>

<style>
  .speaker { min-height: 30px; padding: 2px 8px; font-size: 1rem; margin-left: 6px; vertical-align: middle; }
</style>
