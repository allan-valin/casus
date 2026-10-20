<script>
  /* Spot and fix the error (drills research 2026-10-20, item 10): a real sentence with one word put in a wrong form
   * of its own paradigm. Tap the wrong word; then the right form is shown. */
  import { t } from '../lib/i18n.svelte.js';
  let { items, lang, random = Math.random, onresult = null } = $props();
  const order = (() => { const a = [...items]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  let k = $state(0);
  let tapped = $state(null);
  let score = $state({ right: 0, total: 0 });
  const current = $derived(order[k % Math.max(1, order.length)] ?? null);
  function tap(i) {
    if (tapped !== null) return;
    tapped = i;
    const ok = current.words[i].bad;
    score = { right: score.right + (ok ? 1 : 0), total: score.total + 1 };
    onresult?.({ prompt: current.words.map((w) => w.text).join(' '), answer: current.right }, ok);
  }
  function next() { k += 1; tapped = null; }
</script>

{#if current}
  <div class="spot-drill">
    <p class="spot-sentence" lang={lang.bcp47} dir="auto">
      {#each current.words as w, i}<button class="spot-word" class:bad={tapped !== null && w.bad} class:missed={tapped === i && !w.bad} disabled={tapped !== null} onclick={() => tap(i)}>{w.text}</button>{' '}{/each}
    </p>
    {#if current.meaning}<p class="muted">{current.meaning}</p>{/if}
    {#if tapped !== null}
      <p class="spot-feedback" class:right={current.words[tapped].bad} class:wrong={!current.words[tapped].bad}>{t(current.words[tapped].bad ? 'spot.right' : 'spot.wrong', { wrong: current.wrong, right: current.right })}</p>
      <button class="next primary" onclick={next}>{t('quiz.next')}</button>
    {/if}
    <p class="score">{t('game.score')}: {score.right} / {score.total}</p>
  </div>
{/if}

<style>
  .spot-sentence { font-size: 1.3em; line-height: 2; }
  .spot-word { font: inherit; padding: 2px 6px; border: 1px dashed var(--line); border-radius: 6px; background: var(--panel); color: var(--ink); cursor: pointer; }
  .spot-word.bad { border: 2px solid #c0392b; text-decoration: line-through; }
  .spot-word.missed { border: 2px solid var(--ink-2); }
  .right { color: #1e6b3a; } .wrong { color: #c0392b; }
  .score, .muted { color: var(--ink-2); }
</style>
