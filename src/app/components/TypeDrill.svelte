<script>
  /* Typed recall (drills research 2026-10-20, item 6; productive retrieval, Karpicke & Roediger 2008): the meaning is
   * shown, the learner types the word. A right answer typed without its accents counts, and the full form is shown. */
  import { t } from '../lib/i18n.svelte.js';
  import { sameAnswer } from '../lib/endings.js';
  let { items, lang, random = Math.random, onresult = null } = $props();

  const order = (() => { const a = [...items]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  let k = $state(0);
  let typed = $state('');
  let result = $state(null);
  let score = $state({ right: 0, total: 0 });
  const current = $derived(order[k % Math.max(1, order.length)] ?? null);

  function check() {
    if (!current || result || !typed.trim()) return;
    // any of the right forms counts (a cell with two forms: amavere, amaverunt)
    const hit = (current.accept ?? [current.answer]).map((f) => ({ f, r: sameAnswer(typed, f, lang) })).find((x) => x.r.ok);
    const r = hit ? hit.r : { ok: false, exact: false };
    if (hit) current.answer = hit.f;
    result = { ok: r.ok, exact: r.exact };
    score = { right: score.right + (r.ok ? 1 : 0), total: score.total + 1 };
    onresult?.(current, r.ok);
  }
  function next() { k += 1; typed = ''; result = null; }
</script>

{#if current}
  <div class="type-drill">
    <p class="type-prompt">{current.prompt}</p>
    <form onsubmit={(e) => { e.preventDefault(); result ? next() : check(); }}>
      <input class="type-answer" lang={lang.bcp47} dir="auto" autocomplete="off" autocapitalize="off" spellcheck="false" bind:value={typed} disabled={!!result} placeholder={t('type.placeholder')} />
      {#if !result}<button class="type-check primary" type="button" onclick={check}>{t('type.check')}</button>
      {:else}<button class="next primary" type="button" onclick={next}>{t('quiz.next')}</button>{/if}
    </form>
    {#if result}<p class="type-feedback" class:right={result.ok} class:wrong={!result.ok}>{result.ok ? (result.exact ? t('quiz.right') : t('type.marks', { form: current.answer })) : t('quiz.wrong', { expected: current.answer })}</p>{/if}
    <p class="score">{t('game.score')}: {score.right} / {score.total}</p>
  </div>
{/if}

<style>
  .type-prompt { font-size: 1.3em; margin: 8px 0; }
  form { display: flex; gap: 8px; flex-wrap: wrap; }
  .type-answer { font: inherit; font-size: 1.2em; padding: 6px 10px; border: 1px solid var(--line); border-radius: 8px; min-width: 14em; background: var(--panel); color: var(--ink); }
  .type-feedback.right { color: #1e6b3a; } .type-feedback.wrong { color: #c0392b; }
  .score { color: var(--ink-2); }
</style>
