<script>
  /* One item at a time, four answers to choose from (Allan, 2026-10-18: the most frequent words; set phrases and
   * sayings). After answering: right or wrong, the answer, and for a phrase its word-by-word reading, which shows
   * why a saying cannot be translated word by word. A missed item comes back soon. */
  import { t, ui } from '../lib/i18n.svelte.js';
  import { createChoiceQuiz } from '../lib/quiz.js';
  import { romanOf } from '../lib/roman.js';
  let { items, random = Math.random, romanize = null, onresult = null, ordered = false } = $props();
  let quiz = $state.raw(null);
  let current = $state.raw(null);
  let result = $state(null);
  let picked = $state(null);
  let selected = $state(-1);           // keyboard selection: 1–4 or arrows pick, Enter confirms (Allan, 2026-10-19)
  let score = $state({ right: 0, total: 0 });
  let streak = $state(0);
  $effect(() => {
    if (!items.length) { quiz = null; current = null; return; }
    // a local first: reading the state back inside this effect would make it depend on itself and loop
    const q = createChoiceQuiz(items, { random, ordered });
    quiz = q;
    current = q.current(); result = null; picked = null; selected = -1; score = { ...q.score }; streak = 0;
  });
  function choose(c) {
    if (result || !quiz) return;
    picked = c;
    result = quiz.answer(c);
    onresult?.(current.item, result.correct);              // Learn keeps each lesson's progress
    score = { ...quiz.score }; streak = quiz.streak;
  }
  function next() { quiz.next(); current = quiz.current(); result = null; picked = null; selected = -1; built = []; }
  // word order: the indexes of the tiles placed so far
  let built = $state([]);
  function place(k) {
    built = [...built, k];
    if (built.length === current.item.tokens.length) choose(built.map((i) => current.item.tokens[i]).join(current.item.sep ?? ''));
  }
  // romaji/romanisation: stored, or from the kana reading, or — for a script read letter by letter (Cyrillic) — from
  // the sentence itself; never from kanji, which the romaniser cannot read
  const plainFuri = (f) => f && f.every(([, r]) => !r) ? f.map(([t]) => t).join('') : null;
  const promptRoman = $derived(current ? (current.item.roman ?? (current.item.kana && romanize ? romanOf(current.item.kana, romanize)
    : (current.item.furi ? romanOf(plainFuri(current.item.furi) ?? '', romanize) : romanOf(current.item.prompt, romanize)))) : '');
  function onkey(e) {
    if (!current || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
    const n = current.choices.length;
    if (e.key === 'Enter') {
      if (result) { e.preventDefault(); next(); } else if (selected >= 0) { e.preventDefault(); choose(current.choices[selected]); }
      return;
    }
    if (result) return;
    if (/^[1-9]$/.test(e.key) && Number(e.key) <= n) { e.preventDefault(); selected = Number(e.key) - 1; return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); selected = (selected + 1) % n; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); selected = (selected - 1 + n) % n; }
  }
</script>

<svelte:window onkeydown={onkey} />

{#if !current}
  <p class="muted">{t('drill.loading')}</p>
{:else}
  <div class="quiz">
    <!-- a sentence with furigana where it has readings (Learn, 2026-10-19), else the plain prompt -->
    <p class="quiz-prompt" lang="" dir="auto">{#if current.item.furi}{#each current.item.furi as [t, r]}{#if r}<ruby>{t}<rt>{r}</rt></ruby>{:else}{t}{/if}{/each}{:else}{current.item.prompt}{/if}</p>
    {#if promptRoman}<p class="roman prompt-roman">{promptRoman}</p>{/if}
    {#if current.item.hint ?? (current.item.type === 'gap' ? current.item.en : null)}<p class="quiz-hint">{current.item.hint ?? (ui.lang === 'pt' && current.item.pt ? current.item.pt : current.item.en)}</p>{/if}
    {#if current.item.type === 'order'}
      <!-- put the words in order: tap them, the sentence builds up; it is checked when every word is used -->
      <p class="built" aria-live="polite" dir="auto">{built.map((k) => current.item.tokens[k]).join(current.item.sep ?? '') || '…'}</p>
      <div class="tiles">{#each current.item.tokens as tok, k}<button class="tile" dir="auto" disabled={!!result || built.includes(k)} onclick={() => place(k)}>{tok}</button>{/each}
        {#if built.length && !result}<button class="undo" onclick={() => { built = built.slice(0, -1); }}>⌫</button>{/if}</div>
    {:else}
    <div class="choices">
      {#each current.choices as c, i}
        <button class="choice" class:selected={!result && i === selected} class:right={result && c === current.item.answer} class:wrong={result && c === picked && !result.correct} disabled={!!result} onclick={() => choose(c)}><span class="key" aria-hidden="true">{i + 1}</span><span class="text"><span class="choice-text" dir="auto">{c}</span>{#if romanOf(c, romanize)}<span class="roman">{romanOf(c, romanize)}</span>{/if}</span></button>
      {/each}
    </div>
    {/if}
    {#if result}
      <p class="quiz-feedback" class:right={result.correct} class:wrong={!result.correct} aria-live="polite">
        {result.correct ? t('quiz.right') : t('quiz.wrong', { expected: result.expected })}
      </p>
      {#if current.item.lit?.length}
        <div class="literal" aria-label={t('quiz.literal')}>
          <span class="lit-label">{t('quiz.literal')}:</span>
          {#each current.item.lit as [w, g]}<span class="lit-word"><b>{w}</b>{#if romanOf(w, romanize)}<span class="roman">{romanOf(w, romanize)}</span>{/if}<i>{g || '—'}</i></span>{/each}
        </div>
      {/if}
      {#if current.item.literally || current.item.more?.length || current.item.wiki || current.item.note}
        <div class="about">
          {#if current.item.literally}<p><b>{t('quiz.literally')}:</b> {current.item.literally}</p>{/if}
          {#if current.item.more?.length}<p><b>{t('quiz.also')}:</b> {current.item.more.join('; ')}</p>{/if}
          {#if current.item.note}<p class="casus-note">{current.item.note} <span class="by">({t('quiz.noteBy')})</span></p>{/if}
          {#if current.item.wiki}<p class="wiki">{current.item.wiki.text} <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(current.item.wiki.title.replaceAll(' ', '_'))}`} target="_blank" rel="noopener">{t('quiz.wikiSource', { title: current.item.wiki.title })}</a></p>{/if}
        </div>
      {/if}
      <button class="primary next" onclick={next}>{t('quiz.next')}</button>
    {/if}
    <p class="keys-hint">{t('quiz.keys')}</p>
    <p class="score">{t('game.score')}: {score.right} / {score.total} · {t('game.streak')}: {streak}</p>
  </div>
{/if}

<style>
  .quiz-prompt { font-size: 1.7rem; font-family: Georgia, serif; margin: 10px 0 4px; }
  .roman { display: block; font-style: italic; color: var(--ink-2); font-size: 0.8em; }
  .prompt-roman { font-size: 1rem; margin: 0 0 6px; }
  .quiz-hint { color: var(--ink-2); margin: 0 0 8px; }
  .built { font-size: 1.4rem; min-height: 1.6em; border-bottom: 2px solid var(--line); padding: 4px 2px; margin: 6px 0; }
  .tiles { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .tile, .undo { font: inherit; font-size: 1.15rem; padding: 6px 12px; border: 1.5px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); cursor: pointer; }
  .tile:disabled { opacity: 0.35; cursor: default; }
  .quiz-prompt ruby rt { font-size: 0.5em; color: var(--ink-2); }
  .choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin: 10px 0; }
  .choice { font: inherit; text-align: left; padding: 10px 12px; border: 1.5px solid var(--line); border-radius: 10px; background: var(--panel); color: var(--ink); cursor: pointer; }
  .choice:hover:not(:disabled) { border-color: var(--accent); }
  .choice { display: flex; gap: 10px; align-items: flex-start; }
  .key { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 1.6em; height: 1.6em; border: 1px solid var(--line); border-radius: 6px; font-size: 0.85em; font-weight: 700; color: var(--ink-2); background: var(--panel-hi); }
  .choice.selected { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
  .about { border-left: 3px solid var(--accent); padding: 4px 12px; margin: 8px 0 12px; background: var(--panel-hi); border-radius: 0 8px 8px 0; }
  .about p { margin: 4px 0; }
  .wiki { color: var(--ink-2); }
  .by { color: var(--muted); font-size: 0.85em; }
  .keys-hint { color: var(--muted); font-size: 0.85em; }
  .choice.right { border-color: #1e6b3a; background: #e3f4e8; }
  .choice.wrong { border-color: #c0392b; background: #fdecea; }
  .quiz-feedback { font-weight: 700; }
  .quiz-feedback.right { color: #1e6b3a; }
  .quiz-feedback.wrong { color: #c0392b; }
  /* a box of its own, so it is seen (Allan, 2026-10-19: the Latin word by word was easy to miss) */
  .literal { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; margin: 8px 0 10px; padding: 8px 10px; border: 1.5px solid #6b4e9b; border-radius: 10px; background: color-mix(in srgb, #6b4e9b 7%, var(--panel)); }
  .lit-label { flex-basis: 100%; }
  .lit-label { color: var(--ink-2); font-weight: 600; }
  .lit-word { display: inline-flex; flex-direction: column; border: 1px solid #b9a6d6; border-radius: 8px; padding: 3px 8px; background: var(--panel-hi); }
  .lit-word i { color: var(--ink-2); font-size: 0.85em; }
  .next { font: inherit; padding: 6px 16px; border-radius: 8px; border: 1.5px solid var(--accent); background: var(--accent); color: var(--accent-ink); cursor: pointer; }
  .score { font-weight: 600; }
  .muted { color: var(--muted); }
</style>
