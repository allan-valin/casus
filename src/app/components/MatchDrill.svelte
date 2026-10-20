<script>
  /* Matching grid (drills research 2026-10-20, item 15): words on the left, their meanings shuffled on the right; tap
   * a word, then its meaning. A round is done when every pair is matched. */
  import { t } from '../lib/i18n.svelte.js';
  import { matchRounds } from '../lib/moredrills.js';
  let { items, size = 5, random = Math.random, lang = null, onresult = null } = $props();
  const rounds = matchRounds(items, size, random);
  let r = $state(0);
  let picked = $state(null);
  let paired = $state([]);
  let tries = $state(0);
  let shake = $state(null);
  const round = $derived(rounds[r % Math.max(1, rounds.length)] ?? null);
  const done = $derived(round && paired.length === round.left.length);
  function pickRight(x) {
    if (!picked || paired.includes(x.w)) return;
    tries += 1;
    const ok = picked.w === x.w;
    onresult?.({ prompt: picked.w, answer: picked.en }, ok);
    if (ok) paired = [...paired, x.w]; else shake = x.w;
    picked = null;
  }
  function next() { r += 1; paired = []; tries = 0; picked = null; shake = null; }
</script>

{#if round}
  <div class="match-drill">
    <div class="cols">
      <div class="col">{#each round.left as x}<button class="match-left" lang={lang?.bcp47} class:sel={picked === x} class:ok={paired.includes(x.w)} disabled={paired.includes(x.w)} onclick={() => { picked = x; shake = null; }}>{x.w}</button>{/each}</div>
      <div class="col">{#each round.right as x}<button class="match-right" class:ok={paired.includes(x.w)} class:no={shake === x.w} disabled={paired.includes(x.w)} onclick={() => pickRight(x)}>{x.en}</button>{/each}</div>
    </div>
    {#if done}<p class="match-done">{t('match.done', { n: tries })}</p><button class="next primary" onclick={next}>{t('match.next')}</button>{/if}
  </div>
{:else}<p class="muted">{t('more.none')}</p>{/if}

<style>
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-width: 40em; }
  .col { display: grid; gap: 6px; align-content: start; }
  button { font: inherit; padding: 8px 10px; border: 1.5px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); cursor: pointer; text-align: left; }
  .sel { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
  .ok { border-color: #1e6b3a; color: #1e6b3a; opacity: .7; }
  .no { border-color: #c0392b; }
  .match-done { color: #1e6b3a; font-weight: 600; }
  .muted { color: var(--ink-2); }
</style>
