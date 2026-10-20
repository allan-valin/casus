<script>
  /* Minimal-pair listening (drills research 2026-10-20, item 8; high-variability phonetic training, Thomson 2018):
   * two words one sound apart, one of them spoken; which was it? The IPA is shown after answering. */
  import { t } from '../lib/i18n.svelte.js';
  let { items, voice = null, random = Math.random, onresult = null } = $props();
  const order = (() => { const a = [...items]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  let k = $state(0);
  let picked = $state(null);
  let score = $state({ right: 0, total: 0 });
  const current = $derived(order[k % Math.max(1, order.length)] ?? null);
  async function play() { try { await voice?.speak(current.say.w); } catch { /* no voice */ } }
  function choose(o) {
    if (picked) return;
    picked = o;
    const ok = o.w === current.say.w;
    score = { right: score.right + (ok ? 1 : 0), total: score.total + 1 };
    onresult?.({ prompt: current.options.map((x) => x.w).join(' / '), answer: current.say.w }, ok);
  }
  function next() { k += 1; picked = null; }
</script>

{#if current}
  <div class="pairs-drill">
    <p><button class="pairs-play primary" onclick={play} disabled={!voice}>🔊 {t('pairs.play')}</button></p>
    <div class="options">
      {#each current.options as o}<button class="pairs-option" class:right={picked && o.w === current.say.w} class:wrong={picked === o && o.w !== current.say.w} disabled={!!picked} onclick={() => choose(o)}>{o.w}{#if picked} <span class="ipa">{o.ipa}</span>{/if}</button>{/each}
    </div>
    {#if picked}<button class="next primary" onclick={next}>{t('pairs.next')}</button>{/if}
    <p class="score">{t('game.score')}: {score.right} / {score.total}</p>
  </div>
{:else}<p class="muted">{t('more.none')}</p>{/if}

<style>
  .options { display: flex; gap: 10px; margin: 8px 0; flex-wrap: wrap; }
  .pairs-option { font: inherit; font-size: 1.3em; padding: 10px 18px; border: 1.5px solid var(--line); border-radius: 10px; background: var(--panel); color: var(--ink); cursor: pointer; }
  .right { border-color: #1e6b3a; color: #1e6b3a; } .wrong { border-color: #c0392b; color: #c0392b; }
  .ipa { font-size: .7em; color: var(--ink-2); }
  .score, .muted { color: var(--ink-2); }
</style>
