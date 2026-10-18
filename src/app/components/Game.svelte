<script>
  /* The letters drill (/<code>/game/). Default: every letter of the chosen rows at once, fill the gaps in
   * any order, leave the unsure ones for last (Allan, 2026-10-18). Alternative: one letter at a time.
   * Answer by sound (default) or by name. Small letters and capitals are separate rows. */
  import { tick } from 'svelte';
  import { t } from '../lib/i18n.svelte.js';
  import Speaker from './Speaker.svelte';
  let { lang, random = Math.random, voice = null, shuffle: shuffleDefault = true } = $props();
  const { ROWS, createGame, createGrid } = lang.game;
  let rows = $state(['α-ε']);
  let mode = $state('sound');
  let view = $state('grid');
  let shuffle = $state(shuffleDefault);

  // grid
  // the game objects keep their own state; $state would hold a reactive copy that their methods never update
  let grid = null;
  let cells = $state([]);
  let gridScore = $state({ right: 0, firstTry: 0, total: 0, done: false });
  let inputs = $state([]);
  // single
  let game = $state.raw(null);
  let shown = $state('');
  let typed = $state('');
  let result = $state(null);
  let score = $state({ right: 0, total: 0 });
  let streak = $state(0);
  let single = $state(null);

  function restart() {
    if (rows.length === 0) return;
    if (view === 'grid') {
      grid = createGrid({ rows, mode, random, shuffle });
      cells = grid.cells.map((c) => ({ ...c }));
      gridScore = grid.score;
    } else {
      game = createGame({ rows, mode, random });
      shown = game.shown(); result = null; typed = ''; score = game.score; streak = 0;
      tick().then(() => single?.focus());
    }
  }
  restart();

  function checkCell(i) {
    const r = grid.check(i, cells[i].typed);
    if (r === null) return;
    cells[i] = { ...grid.cells[i], typed: cells[i].typed };
    gridScore = grid.score;
    if (r.correct) {
      // on to the next cell still open
      const next = cells.findIndex((c, j) => j > i && c.state !== 'right' && c.state !== 'revealed');
      const first = next >= 0 ? next : cells.findIndex((c) => c.state !== 'right' && c.state !== 'revealed');
      if (first >= 0) inputs[first]?.focus();
    }
  }
  function reveal() { grid.reveal(); cells = grid.cells.map((c, i) => ({ ...c, typed: cells[i].typed })); gridScore = grid.score; }
  function expectedOf(c) { return (mode === 'name' ? c.letter.names : c.letter.sounds)[0]; }

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
  <p class="hint">{view === 'grid' ? t('game.hint.grid') : t('game.hint.single')}</p>
  <fieldset class="rows">
    <legend>{t('game.rows')}</legend>
    <div class="row-group">
      {#each ROWS.filter((r) => !r.capital && r.id !== 'breathings') as r (r.id)}
        <label><input type="checkbox" value={r.id} bind:group={rows} onchange={restart}> {r.items.map((i) => i.glyph).join(' ')}</label>
      {/each}
    </div>
    <div class="row-group">
      {#each ROWS.filter((r) => r.capital) as r (r.id)}
        <label><input type="checkbox" value={r.id} bind:group={rows} onchange={restart}> {r.items.map((i) => i.glyph).join(' ')}</label>
      {/each}
      {#each ROWS.filter((r) => r.id === 'breathings') as r (r.id)}
        <label><input type="checkbox" value={r.id} bind:group={rows} onchange={restart}> {t('game.breathings')}</label>
      {/each}
    </div>
  </fieldset>
  <div class="modes">
    <span class="group-label">{t('game.answerBy')}</span>
    <label><input type="radio" name="answer" value="sound" bind:group={mode} onchange={restart}> {t('game.mode.sound')}</label>
    <label><input type="radio" name="answer" value="name" bind:group={mode} onchange={restart}> {t('game.mode.name')}</label>
    <span class="group-label">{t('game.view')}</span>
    <label><input type="radio" name="view" value="grid" bind:group={view} onchange={restart}> {t('game.view.grid')}</label>
    <label><input type="radio" name="view" value="single" bind:group={view} onchange={restart}> {t('game.view.single')}</label>
    {#if view === 'grid'}<label><input type="checkbox" bind:checked={shuffle} onchange={restart}> {t('game.shuffle')}</label>{/if}
  </div>

  {#if rows.length === 0}
    <p class="feedback">{t('game.noRows')}</p>
  {:else if view === 'grid'}
    <div class="grid">
      {#each cells as c, i (i)}
        <div class="cell" class:right={c.state === 'right'} class:wrong={c.state === 'wrong'} class:revealed={c.state === 'revealed'}>
          <span class="glyph">{c.glyph}</span>
          {#if c.state === 'revealed'}
            <span class="answer-shown">{expectedOf(c)}</span>
          {:else}
            <input bind:this={inputs[i]} bind:value={cells[i].typed} readonly={c.state === 'right'} autocomplete="off" autocapitalize="off" spellcheck="false"
                   aria-label={`${t('game.answer')} ${c.glyph}`}
                   onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); checkCell(i); } }}
                   onblur={() => checkCell(i)}>
          {/if}
          {#if c.state === 'wrong'}<span class="tries">✗</span>{/if}
        </div>
      {/each}
    </div>
    <div class="grid-actions">
      <p class="score">{t('game.score')}: {gridScore.right} / {gridScore.total} · {t('game.firstTry')}: {gridScore.firstTry}{gridScore.done ? ` · ${t('game.done')}` : ''}</p>
      <button onclick={reveal} disabled={gridScore.done}>{t('game.reveal')}</button>
      <button class="primary" onclick={restart}>{t('game.newRound')}</button>
    </div>
  {:else}
    <div class="stage">
      <div class="letter" class:right={result?.correct} class:wrong={result && !result.correct}>{shown}</div>
      <Speaker text={game.current().spoken} {voice} />
    </div>
    <form onsubmit={submit}>
      <input class="answer" bind:this={single} bind:value={typed} autocomplete="off" autocapitalize="off" spellcheck="false"
             placeholder={mode === 'name' ? t('game.placeholder.name') : t('game.placeholder.sound')} aria-label={t('game.answer')}>
      <button class="primary" type="submit">{result ? t('game.next') : t('game.check')}</button>
    </form>
    <p class="feedback" aria-live="polite">{#if result}{result.correct ? t('game.right', { expected: result.expected }) : t('game.wrong', { expected: result.expected })}{/if}</p>
    <p class="score">{t('game.score')}: {score.right} / {score.total} · {t('game.streak')}: {streak}</p>
  {/if}
</section>

<style>
  .game { display: flex; flex-direction: column; gap: 12px; }
  h2 { margin: 0; }
  .hint { margin: 0; color: var(--ink-2); }
  .rows { display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px 8px; }
  .rows legend { color: var(--ink-2); font-size: 0.85rem; }
  .row-group { display: flex; flex-wrap: wrap; gap: 6px 16px; }
  .rows label { font-family: Georgia, 'Gentium Plus', serif; font-size: 1.1rem; }
  .modes { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
  .group-label { color: var(--ink-2); font-size: 0.9rem; font-weight: 600; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 10px; }
  .cell { display: flex; flex-direction: column; align-items: center; gap: 4px; border: 2px solid var(--line); border-radius: 10px; padding: 6px; background: var(--panel); position: relative; }
  .cell.right { border-color: #009E73; background: color-mix(in srgb, #009E73 10%, white); }
  .cell.wrong { border-color: #D55E00; border-style: dashed; }
  .cell.revealed { border-color: var(--muted); border-style: dotted; }
  .glyph { font-family: Georgia, 'Gentium Plus', serif; font-size: 2.4rem; line-height: 1.1; }
  .cell input { width: 100%; box-sizing: border-box; text-align: center; font: inherit; padding: 4px; border: 1px solid var(--line); border-radius: 6px; }
  .answer-shown { color: var(--muted); font-style: italic; padding: 4px; }
  .tries { position: absolute; top: 2px; right: 6px; color: #D55E00; font-size: 0.8rem; }
  .grid-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .grid-actions .score { margin: 0 auto 0 0; }
  .stage { display: flex; align-items: center; justify-content: center; gap: 12px; }
  .letter { font-family: Georgia, 'Gentium Plus', serif; font-size: clamp(5rem, 4rem + 6vw, 9rem); line-height: 1.1; min-width: 1.4em; text-align: center; border: 2px solid var(--line); border-radius: 16px; padding: 6px 18px; background: var(--panel); }
  .letter.right { border-color: #009E73; }
  .letter.wrong { border-color: #D55E00; border-style: dashed; }
  form { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
  .answer { font: inherit; font-size: 1.2rem; padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px; min-width: 12em; }
  .feedback { text-align: center; min-height: 1.4em; margin: 0; font-weight: 600; }
  .score { text-align: center; color: var(--ink-2); margin: 0; }
</style>
