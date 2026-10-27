<script>
  /* Listening and dictation (drills research 2026-10-20, items 7 and 9): a sentence from this language's Learn lessons
   * is spoken and not shown. Choose its meaning, or type what you heard and see each word marked; then the sentence
   * is shown. Sentences: Tatoeba and the courses' own examples, a dozen lessons drawn at random each time. */
  import { onMount } from 'svelte';
  import { t, ui } from '../lib/i18n.svelte.js';
  import { sentencePool, meaningQuestion, dictationDiff } from '../lib/listen.js';
  let { lang, voice = null, loadData, random = Math.random, onresult = null } = $props();

  const shuffle = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let pool = $state([]);
  let loading = $state(true);
  let mode = $state('meaning');
  let k = $state(0);
  let picked = $state(null);
  let typed = $state('');
  let diff = $state(null);
  let score = $state({ right: 0, total: 0 });
  let failed = $state(false);
  onMount(async () => {
    try {
      const index = await loadData('learn');
      const ids = (index?.levels ?? []).filter((lv) => !lv.reference).flatMap((lv) => lv.topics.filter((tp) => tp.kind !== 'vocab').flatMap((tp) => tp.lessons.map((l) => l.id)));
      const lessons = await Promise.all(shuffle(ids).slice(0, 12).map((id) => loadData(`learn/${id}`).catch(() => null)));
      pool = shuffle(sentencePool(lessons.filter(Boolean)));
    } catch { pool = []; }
    loading = false;
  });
  const q = $derived(pool.length ? meaningQuestion(pool, k, ui.lang, random) : null);
  const done = $derived(picked !== null || diff !== null);
  async function play() {
    if (!q || !voice) return;
    failed = false;
    try { await voice.speak(q.text); } catch { failed = true; }
  }
  function record(ok) { score = { right: score.right + (ok ? 1 : 0), total: score.total + 1 }; onresult?.(q, ok); }
  function choose(o) { if (done) return; picked = o; record(o === q.answer); }
  function check() { if (done || !typed.trim()) return; diff = dictationDiff(q.text, typed, lang); record(diff.ok); }
  function next() { k += 1; picked = null; typed = ''; diff = null; }
  function setMode(m) { mode = m; next(); }
</script>

<div class="listen-drill">
  <div class="modes" role="group">
    <button class="mode" data-mode="meaning" aria-pressed={mode === 'meaning'} onclick={() => setMode('meaning')}>{t('listen.meaning')}</button>
    <button class="mode" data-mode="dictation" aria-pressed={mode === 'dictation'} onclick={() => setMode('dictation')}>{t('listen.dictation')}</button>
  </div>
  {#if loading}<p class="muted">{t('drill.loading')}</p>
  {:else if !q}<p class="muted">{t('listen.none')}</p>
  {:else}
    <p><button class="listen-play primary" onclick={play} disabled={!voice}>🔊 {t('listen.play')}</button>{#if failed} <span class="wrong">{t('voice.none')}</span>{/if}</p>
    {#if mode === 'meaning'}
      <div class="options">
        {#each q.options as o}<button class="listen-option" class:right={done && o === q.answer} class:wrong={picked === o && o !== q.answer} disabled={done} onclick={() => choose(o)}>{o}</button>{/each}
      </div>
    {:else}
      <form onsubmit={(e) => { e.preventDefault(); done ? next() : check(); }}>
        <input class="listen-answer" lang={lang.bcp47} dir="auto" autocomplete="off" autocapitalize="off" spellcheck="false" bind:value={typed} disabled={done} placeholder={t('listen.type')} />
        {#if !done}<button class="listen-check primary" type="button" onclick={check}>{t('type.check')}</button>{/if}
      </form>
      {#if diff}<p class="marks">{#each diff.words as w}<span class="listen-word" class:right={w.ok} class:wrong={!w.ok}>{w.w}</span> {/each}</p>{/if}
    {/if}
    {#if done}
      <p class="listen-text" lang={lang.bcp47} dir="auto">{q.text} <span class="muted">— {q.answer}</span></p>
      <button class="next primary" onclick={next}>{t('quiz.next')}</button>
    {/if}
    <p class="score">{t('game.score')}: {score.right} / {score.total}</p>
  {/if}
</div>

<style>
  .modes { display: flex; gap: 6px; margin-bottom: 8px; }
  .mode[aria-pressed='true'] { background: var(--fill); color: var(--fill-ink); }
  .options { display: grid; gap: 6px; max-width: 36em; }
  .listen-option { text-align: left; }
  .listen-option.right, .listen-word.right { color: #1e6b3a; font-weight: 600; }
  .listen-option.wrong, .listen-word.wrong, .wrong { color: #c0392b; }
  .listen-word.wrong { text-decoration: underline wavy; }
  form { display: flex; gap: 8px; flex-wrap: wrap; }
  .listen-answer { font: inherit; font-size: 1.1em; padding: 6px 10px; border: 1px solid var(--line); border-radius: 8px; min-width: 18em; background: var(--panel); color: var(--ink); }
  .listen-text { font-size: 1.2em; }
  .score, .muted { color: var(--ink-2); }
</style>
