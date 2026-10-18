<script>
  /* One item at a time, four answers to choose from (Allan, 2026-10-18: the most frequent words; set phrases and
   * sayings). After answering: right or wrong, the answer, and for a phrase its word-by-word reading, which shows
   * why a saying cannot be translated word by word. A missed item comes back soon. */
  import { t } from '../lib/i18n.svelte.js';
  import { createChoiceQuiz } from '../lib/quiz.js';
  let { items, random = Math.random } = $props();
  let quiz = $state.raw(null);
  let current = $state.raw(null);
  let result = $state(null);
  let picked = $state(null);
  let score = $state({ right: 0, total: 0 });
  let streak = $state(0);
  $effect(() => {
    if (!items.length) { quiz = null; current = null; return; }
    // a local first: reading the state back inside this effect would make it depend on itself and loop
    const q = createChoiceQuiz(items, { random });
    quiz = q;
    current = q.current(); result = null; picked = null; score = { ...q.score }; streak = 0;
  });
  function choose(c) {
    if (result || !quiz) return;
    picked = c;
    result = quiz.answer(c);
    score = { ...quiz.score }; streak = quiz.streak;
  }
  function next() { quiz.next(); current = quiz.current(); result = null; picked = null; }
</script>

{#if !current}
  <p class="muted">{t('drill.loading')}</p>
{:else}
  <div class="quiz">
    <p class="quiz-prompt" lang="">{current.item.prompt}</p>
    {#if current.item.hint}<p class="quiz-hint">{current.item.hint}</p>{/if}
    <div class="choices">
      {#each current.choices as c}
        <button class="choice" class:right={result && c === current.item.answer} class:wrong={result && c === picked && !result.correct} disabled={!!result} onclick={() => choose(c)}>{c}</button>
      {/each}
    </div>
    {#if result}
      <p class="quiz-feedback" class:right={result.correct} class:wrong={!result.correct} aria-live="polite">
        {result.correct ? t('quiz.right') : t('quiz.wrong', { expected: result.expected })}
      </p>
      {#if current.item.lit?.length}
        <div class="literal" aria-label={t('quiz.literal')}>
          <span class="lit-label">{t('quiz.literal')}:</span>
          {#each current.item.lit as [w, g]}<span class="lit-word"><b>{w}</b><i>{g || '—'}</i></span>{/each}
        </div>
      {/if}
      <button class="primary next" onclick={next}>{t('quiz.next')}</button>
    {/if}
    <p class="score">{t('game.score')}: {score.right} / {score.total} · {t('game.streak')}: {streak}</p>
  </div>
{/if}

<style>
  .quiz-prompt { font-size: 1.7rem; font-family: Georgia, serif; margin: 10px 0 4px; }
  .quiz-hint { color: var(--ink-2); margin: 0 0 8px; }
  .choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin: 10px 0; }
  .choice { font: inherit; text-align: left; padding: 10px 12px; border: 1.5px solid var(--line); border-radius: 10px; background: var(--panel); color: var(--ink); cursor: pointer; }
  .choice:hover:not(:disabled) { border-color: var(--accent); }
  .choice.right { border-color: #1e6b3a; background: #e3f4e8; }
  .choice.wrong { border-color: #c0392b; background: #fdecea; }
  .quiz-feedback { font-weight: 700; }
  .quiz-feedback.right { color: #1e6b3a; }
  .quiz-feedback.wrong { color: #c0392b; }
  .literal { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; margin: 6px 0 10px; }
  .lit-label { color: var(--ink-2); font-weight: 600; }
  .lit-word { display: inline-flex; flex-direction: column; border: 1px solid var(--line-soft); border-radius: 8px; padding: 3px 8px; background: var(--panel-hi); }
  .lit-word i { color: var(--ink-2); font-size: 0.85em; }
  .next { font: inherit; padding: 6px 16px; border-radius: 8px; border: 1.5px solid var(--accent); background: var(--accent); color: var(--accent-ink); cursor: pointer; }
  .score { font-weight: 600; }
  .muted { color: var(--muted); }
</style>
