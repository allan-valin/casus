<script>
  /* Learn (Allan, 2026-10-19; design 2026-10-19-learn-and-three-sites-design.md §2): every topic of every level
   * (JLPT N5–N1, CEFR A1–C2…), a lesson per grammar point, vocabulary set or kanji set, practice questions for each
   * lesson, and a practice section for a chosen range of levels. Progress is kept in this browser. */
  import { onMount } from 'svelte';
  import { t, ui } from '../lib/i18n.svelte.js';
  import { lessonQuestions, practiceQuestions } from '../../lib/learn/questions.js';
  import ChoiceDrill from './ChoiceDrill.svelte';
  let { lang, loadLearn, storage = null, random = Math.random, openInReader = null } = $props();

  let learn = $state(null);
  let failed = $state(false);
  let mode = $state('lessons');
  let levelId = $state(null);
  let open = $state(null);                     // { lesson, level }
  let quizItems = $state([]);
  let from = $state(null);
  let to = $state(null);
  let progress = $state({});
  const KEY = `casus:learn:${lang.code}`;

  onMount(async () => {
    try { progress = JSON.parse(storage?.getItem(KEY) ?? '{}'); } catch { progress = {}; }
    try {
      learn = await loadLearn();
      if (!learn?.levels?.length) { failed = true; return; }
      levelId = learn.levels[0].id;
      from = learn.levels[0].id;
      to = learn.levels[0].id;
    } catch { failed = true; }
  });

  const level = $derived(learn?.levels.find((l) => l.id === levelId) ?? null);
  const meaning = (o) => (o ? o[ui.lang] ?? o.en ?? '' : '');
  function record(item, correct) {
    const p = progress[item.lesson] ?? { right: 0, total: 0 };
    progress = { ...progress, [item.lesson]: { right: p.right + (correct ? 1 : 0), total: p.total + 1 } };
    try { storage?.setItem(KEY, JSON.stringify(progress)); } catch { /* not kept */ }
  }
  const pct = (id) => { const p = progress[id]; return p?.total ? Math.round((100 * p.right) / p.total) : null; };
  function openLesson(lesson) { open = { lesson, level }; quizItems = []; }
  function practiseLesson() { quizItems = lessonQuestions(open.lesson, open.level, { ui: ui.lang, random }); }
  function startPractice() { quizItems = practiceQuestions(learn, from, to, { n: 30, ui: ui.lang, random }); }
  const kindName = (k) => t(`learn.kind.${k}`);
</script>

<section class="card learn">
  <h2>{t('learn.heading')} {#if learn}<span class="system">{learn.system}</span>{/if}</h2>
  {#if failed}
    <p class="muted">{t('learn.none', { language: lang.name[ui.lang] ?? lang.name.en })}</p>
  {:else if !learn}
    <p class="muted">{t('drill.loading')}</p>
  {:else}
    <div class="modes" role="tablist">
      <button class="mode-tab" data-mode="lessons" aria-selected={mode === 'lessons'} class:active={mode === 'lessons'} onclick={() => { mode = 'lessons'; quizItems = []; }}>{t('learn.lessons')}</button>
      <button class="mode-tab" data-mode="practice" aria-selected={mode === 'practice'} class:active={mode === 'practice'} onclick={() => { mode = 'practice'; open = null; quizItems = []; }}>{t('learn.practice')}</button>
    </div>

    {#if mode === 'lessons'}
      <div class="levels" role="tablist">
        {#each learn.levels as l}<button class="level-tab" class:active={l.id === levelId} aria-selected={l.id === levelId} onclick={() => { levelId = l.id; open = null; quizItems = []; }}>{l.id}</button>{/each}
      </div>
      {#if open}
        <button class="back" onclick={() => { open = null; quizItems = []; }}>← {t('learn.back')}</button>
        <article class="lesson">
          {#if open.lesson.kind === 'grammar'}
            <p class="pattern" lang={lang.bcp47}>{open.lesson.pattern}</p>
            {#if open.lesson.romaji}<p class="romaji">{open.lesson.romaji}</p>{/if}
            <p class="meaning">{meaning(open.lesson.meaning)}</p>
            {#if open.lesson.formation}<p class="formation"><b>{t('learn.formation')}:</b> {open.lesson.formation}</p>{/if}
            {#each open.lesson.examples ?? [] as ex}
              <div class="example"><span class="ex-text" lang={lang.bcp47}>{ex.text}</span> <span class="ex-en">{ex.en}</span>
                {#if openInReader}<button class="to-reader" onclick={() => openInReader(ex.text)}>{t('learn.read')}</button>{/if}</div>
            {/each}
            {#if meaning(open.lesson.notes)}<p class="notes">{meaning(open.lesson.notes)}</p>{/if}
          {:else if open.lesson.kind === 'vocab'}
            <table class="words"><tbody>{#each open.lesson.words as w}<tr><td class="w" lang={lang.bcp47}>{w.w}</td><td class="r">{w.reading ?? ''}</td><td>{w.en}</td></tr>{/each}</tbody></table>
          {:else if open.lesson.kind === 'kanji'}
            <table class="words"><tbody>{#each open.lesson.kanji as k}<tr><td class="w big" lang={lang.bcp47}>{k.k}</td><td>{k.en}</td><td class="r">{k.on}</td><td class="r">{k.kun}</td><td class="r">{k.words.join('、')}</td></tr>{/each}</tbody></table>
          {/if}
          <p class="source">{t('learn.source')}: {open.lesson.source ?? learn.credit}</p>
          <button class="practice-lesson primary" onclick={practiseLesson}>{t('learn.practiceLesson')}</button>
        </article>
      {:else}
        {#each level?.units ?? [] as u (u.id)}
          <section class="unit">
            <h3><span class="kind" data-kind={u.kind}>{kindName(u.kind)} {u.n}</span> <span class="title" lang={lang.bcp47}>{u.title}</span></h3>
            <ul class="lesson-list">
              {#each u.lessons as l (l.id)}
                <li><button class="lesson-link" data-lesson={l.id} onclick={() => openLesson(l)}>
                  <span lang={lang.bcp47}>{l.kind === 'grammar' ? l.pattern : kindName(l.kind) + ' ' + u.n}</span>{#if l.kind === 'grammar'} <span class="gloss">{meaning(l.meaning)}</span>{/if}
                  {#if pct(l.id) !== null}<span class="pct" class:good={pct(l.id) >= 80}>{pct(l.id)}%</span>{/if}
                </button></li>
              {/each}
            </ul>
          </section>
        {/each}
      {/if}
    {:else}
      <div class="range">
        <label>{t('learn.from')} <select class="range" bind:value={from}>{#each learn.levels as l}<option value={l.id}>{l.id}</option>{/each}</select></label>
        <label>{t('learn.to')} <select class="range" bind:value={to}>{#each learn.levels as l}<option value={l.id}>{l.id}</option>{/each}</select></label>
        <button class="start-practice primary" onclick={startPractice}>{t('learn.start')}</button>
      </div>
    {/if}
    {#if quizItems.length}<div class="quiz-wrap"><ChoiceDrill items={quizItems} {random} romanize={lang.script?.romanize ?? null} onresult={record} /></div>{/if}
    <p class="credit">{learn.credit}</p>
  {/if}
</section>

<style>
  .system { font-size: 0.7em; color: var(--ink-2); font-weight: 400; margin-left: 6px; }
  .modes, .levels { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 10px; }
  .mode-tab, .level-tab, button { font: inherit; padding: 5px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--ink); cursor: pointer; }
  .mode-tab.active, .level-tab.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  button.primary { border-color: var(--accent); font-weight: 600; border-radius: 8px; }
  .unit h3 { font-size: 1rem; margin: 12px 0 4px; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
  .kind { font-size: 0.78em; padding: 1px 8px; border-radius: 6px; border: 1px solid var(--line); color: var(--ink-2); white-space: nowrap; }
  .kind[data-kind=grammar] { border-color: #1f77b4; } .kind[data-kind=vocab] { border-color: #2e8b57; } .kind[data-kind=kanji] { border-color: #9467bd; }
  .title { color: var(--ink-2); font-weight: 400; }
  .lesson-list { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .lesson-link { border-radius: 8px; text-align: left; }
  .gloss { color: var(--ink-2); font-size: 0.88em; }
  .pct { font-size: 0.8em; margin-left: 6px; color: #b06000; } .pct.good { color: #2e8b57; }
  .lesson { border: 1px solid var(--line-soft); border-radius: 10px; padding: 10px 14px; margin: 8px 0; background: var(--panel); }
  .pattern { font-size: 1.8rem; margin: 4px 0; font-family: Georgia, serif; }
  .romaji { color: var(--ink-2); font-style: italic; margin: 0; }
  .meaning { font-size: 1.1em; font-weight: 600; }
  .example { margin: 6px 0; padding: 6px 10px; background: var(--panel-hi); border-radius: 8px; display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; }
  .ex-text { font-size: 1.15em; } .ex-en { color: var(--ink-2); }
  .notes { border-left: 3px solid var(--accent); padding-left: 10px; color: var(--ink-2); }
  .source, .credit { color: var(--muted); font-size: 0.85em; }
  .words { border-collapse: collapse; } .words td { border-bottom: 1px solid var(--line-soft); padding: 3px 10px; }
  .w { font-size: 1.15em; } .big { font-size: 1.6em; } .r { color: var(--ink-2); }
  .range { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .back { margin-bottom: 6px; }
  .quiz-wrap { margin-top: 10px; border-top: 1px solid var(--line-soft); padding-top: 6px; }
</style>
