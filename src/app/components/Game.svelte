<script>
  /* The alphabet drill page (/<code>/game/): rows, mode, the letter, an answer box, score and streak. */
  import { t } from '../lib/i18n.svelte.js';
  import Speaker from './Speaker.svelte';
  let { lang, random = Math.random, voice = null } = $props();
  const { ROWS, createGame } = lang.game;
  let rows = $state(['α-ε']);
  let mode = $state('name');
  let capitals = $state(false);
  let game = $state(createGame({ rows: ['α-ε'], mode: 'name', random }));
  let shown = $state(game.shown());
  let typed = $state('');
  let result = $state(null);
  let score = $state({ right: 0, total: 0 });
  let streak = $state(0);
  let input = $state(null);

  function restart() {
    if (rows.length === 0) return;
    game = createGame({ rows, mode, random, capitals });
    shown = game.shown(); result = null; typed = ''; score = game.score; streak = 0;
    input?.focus();
  }
  function submit(e) {
    e.preventDefault();
    if (result) { game.next(); shown = game.shown(); result = null; typed = ''; return; }
    if (!typed.trim()) return;
    result = game.answer(typed);
    score = game.score; streak = game.streak;
  }
</script>

<section class="card game">
  <h2>{t('game.heading')}</h2>
  <p class="hint">{t('game.hint')}</p>
  <fieldset class="rows">
    <legend>{t('game.rows')}</legend>
    {#each ROWS as r (r.id)}
      <label><input type="checkbox" value={r.id} bind:group={rows} onchange={restart}> {r.id === 'breathings' ? t('game.breathings') : r.letters.map((l) => l.lower).join(' ')}</label>
    {/each}
  </fieldset>
  <div class="modes">
    <label><input type="radio" value="name" bind:group={mode} onchange={restart}> {t('game.mode.name')}</label>
    <label><input type="radio" value="sound" bind:group={mode} onchange={restart}> {t('game.mode.sound')}</label>
    <label><input type="checkbox" bind:checked={capitals} onchange={restart}> {t('game.capitals')}</label>
  </div>
  <div class="stage">
    <div class="letter" class:right={result?.correct} class:wrong={result && !result.correct}>{shown}</div>
    <Speaker text={game.current().spoken} {voice} />
  </div>
  <form onsubmit={submit}>
    <input class="answer" bind:this={input} bind:value={typed} autocomplete="off" autocapitalize="off" spellcheck="false"
           placeholder={mode === 'name' ? t('game.placeholder.name') : t('game.placeholder.sound')} aria-label={t('game.answer')}>
    <button class="primary" type="submit">{result ? t('game.next') : t('game.check')}</button>
  </form>
  <p class="feedback" aria-live="polite">{#if result}{result.correct ? t('game.right', { expected: result.expected }) : t('game.wrong', { expected: result.expected })}{/if}</p>
  <p class="score">{t('game.score')}: {score.right} / {score.total} · {t('game.streak')}: {streak}</p>
</section>

<style>
  .game { display: flex; flex-direction: column; gap: 12px; }
  h2 { margin: 0; }
  .hint { margin: 0; color: var(--ink-2); }
  .rows { display: flex; flex-wrap: wrap; gap: 6px 14px; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px 8px; }
  .rows legend { color: var(--ink-2); font-size: 0.85rem; }
  .rows label { font-family: Georgia, serif; font-size: 1.1rem; }
  .modes { display: flex; flex-wrap: wrap; gap: 14px; }
  .stage { display: flex; align-items: center; justify-content: center; gap: 12px; }
  .letter { font-family: Georgia, 'Gentium Plus', serif; font-size: clamp(5rem, 4rem + 6vw, 9rem); line-height: 1.1; min-width: 1.4em; text-align: center; border: 2px solid var(--line); border-radius: 16px; padding: 6px 18px; background: var(--panel); }
  .letter.right { border-color: #009E73; }
  .letter.wrong { border-color: #D55E00; border-style: dashed; }
  form { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
  .answer { font: inherit; font-size: 1.2rem; padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px; min-width: 12em; }
  .feedback { text-align: center; min-height: 1.4em; margin: 0; font-weight: 600; }
  .score { text-align: center; color: var(--ink-2); margin: 0; }
</style>
