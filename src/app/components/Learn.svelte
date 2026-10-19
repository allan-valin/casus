<script>
  /* Learn (Allan, 2026-10-19; second version after his review): a level's topics with their lessons listed under each
   * (like bentojapanese.com/learn/grammar), a lesson as a page — explanation, formation, examples with furigana and
   * romaji, nuance, contrasts, common mistakes, the book's own practice with answers to reveal — and exercises by the
   * hundred (gap, translation both ways, word order) from the lesson and from Tatoeba. A practice section mixes a range
   * of levels. Progress is kept in this browser. */
  import { onMount } from 'svelte';
  import { t, ui } from '../lib/i18n.svelte.js';
  import { questionsFromFile } from '../../lib/learn/questions.js';
  import ChoiceDrill from './ChoiceDrill.svelte';
  let { lang, loadLearn, loadLesson, loadQuestions, storage = null, random = Math.random, openInReader = null } = $props();

  let learn = $state(null);
  let failed = $state(false);
  let mode = $state('lessons');
  let levelId = $state(null);
  let lesson = $state(null);                   // the open lesson's full data
  let lessonRef = $state(null);                // { level, topic, entry }
  let quizItems = $state([]);
  let from = $state(null);
  let to = $state(null);
  let search = $state('');
  let progress = $state({});
  let loading = $state(false);
  const KEY = `casus:learn:${lang.code}`;
  // lessons written for Casus keep their text per interface language ({ en, pt }); the Japanese book's is English
  const loc = (x) => (x == null ? '' : typeof x === 'string' ? x : (x[ui.lang] ?? x.en ?? ''));
  // a script that writes its vowels only sometimes (Arabic): romanise only text that mostly has them, the rest would be
  // bare letters (ʔḵšā ʔnn)
  const vowelledEnough = (t) => { const letters = (t.match(/\p{L}/gu) ?? []).length; return letters > 0 && (t.match(/\p{M}/gu) ?? []).length / letters >= 0.4; };
  const romanize = lang.script?.romanize ? (lang.script.hasMarks && lang.script.rtl ? (t) => (vowelledEnough(t) ? lang.script.romanize(t) : '') : lang.script.romanize) : null;

  onMount(async () => {
    try { progress = JSON.parse(storage?.getItem(KEY) ?? '{}'); } catch { progress = {}; }
    try {
      learn = await loadLearn();
      if (!learn?.levels?.length) { failed = true; return; }
      levelId = learn.levels[0].id; from = levelId; to = levelId;
    } catch { failed = true; }
  });

  const level = $derived(learn?.levels.find((l) => l.id === levelId) ?? null);
  const flat = $derived(learn ? learn.levels.flatMap((lv) => lv.topics.flatMap((tp) => tp.lessons.map((e) => ({ level: lv, topic: tp, entry: e })))) : []);
  const visible = (tp) => (!search.trim() ? tp.lessons : tp.lessons.filter((e) => `${e.title} ${loc(e.meaning)}`.toLowerCase().includes(search.trim().toLowerCase())));
  function record(item, correct) {
    const p = progress[item.lesson] ?? { right: 0, total: 0 };
    progress = { ...progress, [item.lesson]: { right: p.right + (correct ? 1 : 0), total: p.total + 1 } };
    try { storage?.setItem(KEY, JSON.stringify(progress)); } catch { /* not kept */ }
  }
  const pct = (id) => { const p = progress[id]; return p?.total ? Math.round((100 * p.right) / p.total) : null; };
  async function open(ref) {
    loading = true; quizItems = [];
    lessonRef = ref;
    lesson = await loadLesson(ref.entry.id);
    loading = false;
    try { window.scrollTo({ top: 0 }); } catch { /* jsdom */ }
  }
  const neighbour = (d) => { const k = flat.findIndex((x) => x.entry.id === lessonRef?.entry.id); return k >= 0 ? flat[k + d] ?? null : null; };
  function vocabQuestions(l) {
    if (l.kind === 'vocab') {
      const ens = l.words.map((w) => w.en); const ws = l.words.map((w) => w.w);
      return l.words.flatMap((w) => [{ type: 'word', lesson: l.id, prompt: w.w, kana: w.reading, answer: w.en, pool: ens }, { type: 'word-back', lesson: l.id, prompt: w.en, answer: w.w, pool: ws }]);
    }
    const ens = l.kanji.map((k) => k.en); const rs = l.kanji.map((k) => (k.kun || k.on).split(';')[0].trim());
    return l.kanji.flatMap((k, i) => [{ type: 'kanji', lesson: l.id, prompt: k.k, answer: k.en, pool: ens }, ...(rs[i] ? [{ type: 'kanji-reading', lesson: l.id, prompt: k.k, answer: rs[i], pool: rs }] : [])]);
  }
  async function startExercises() {
    if (lesson.kind === 'vocab' || lesson.kind === 'kanji') { quizItems = vocabQuestions(lesson); return; }
    quizItems = bookFirst(questionsFromFile(await loadQuestions(lesson.id), { lesson: lesson.id, random, ui: ui.lang }));
  }
  // the lesson's own examples first, in order; then Tatoeba's and the derived ones, shuffled
  function bookFirst(qs) {
    // the lesson's own questions and the book's (D'Ooge) in order; Tatoeba's and the texts' (Xenophon…) shuffled
    const own = qs.filter((q) => (!q.source || q.source === 'book' || q.source === 'drill') && !q.derivedFrom);
    const rest = qs.filter((q) => !own.includes(q));
    for (let i = rest.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    return [...own, ...rest];
  }
  async function startPractice() {
    const ids = learn.levels.map((l) => l.id);
    const [a, b] = [ids.indexOf(from), ids.indexOf(to)].sort((x, y) => x - y);
    const pool = flat.filter((x) => { const k = ids.indexOf(x.level.id); return k >= a && k <= b && x.topic.kind === 'grammar'; });
    const picked = [];
    const copy = [...pool];
    while (copy.length && picked.length < 12) picked.push(copy.splice(Math.floor(random() * copy.length), 1)[0]);
    loading = true;
    const files = await Promise.all(picked.map((x) => loadQuestions(x.entry.id).then((f) => questionsFromFile(f, { lesson: x.entry.id, random, ui: ui.lang })).catch(() => [])));
    loading = false;
    const all = files.flat();
    for (let i = all.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    quizItems = all;
  }
  const kindName = (k) => t(`learn.kind.${k}`);
  // word-spaced romaji from the reader (tools/learn_examples.mjs); bare kana only as a fallback
  const exampleRoman = (ex) => ex.roman ?? (ex.kana && romanize ? romanize(ex.kana) : '');
</script>

<section class="card learn">
  <header class="learn-head">
    <h2>{t('learn.heading')}</h2>
    {#if learn}<span class="system">{learn.system}</span>{/if}
    <div class="modes" role="tablist">
      <button class="mode-tab" data-mode="lessons" aria-selected={mode === 'lessons'} class:active={mode === 'lessons'} onclick={() => { mode = 'lessons'; quizItems = []; }}>{t('learn.lessons')}</button>
      <button class="mode-tab" data-mode="practice" aria-selected={mode === 'practice'} class:active={mode === 'practice'} onclick={() => { mode = 'practice'; lesson = null; quizItems = []; }}>{t('learn.practice')}</button>
    </div>
  </header>
  {#if failed}
    <p class="muted">{t('learn.none', { language: lang.name[ui.lang] ?? lang.name.en })}</p>
  {:else if !learn}
    <p class="muted">{t('drill.loading')}</p>
  {:else if mode === 'practice'}
    <div class="range-box">
      <label>{t('learn.from')} <select class="range" bind:value={from}>{#each learn.levels as l}<option value={l.id}>{l.title ? loc(l.title) : l.id}</option>{/each}</select></label>
      <label>{t('learn.to')} <select class="range" bind:value={to}>{#each learn.levels as l}<option value={l.id}>{l.title ? loc(l.title) : l.id}</option>{/each}</select></label>
      <button class="start-practice primary" onclick={startPractice} disabled={loading}>{t('learn.start')}</button>
    </div>
    {#if quizItems.length}<p class="ex-count">{t('learn.exCount', { n: quizItems.length })}</p><ChoiceDrill items={quizItems} {random} {romanize} onresult={record} ordered />{/if}
  {:else if lesson && lessonRef}
    <!-- one lesson, as a page -->
    <article class="lesson-page" style={`--script-scale: ${lang.script?.fontScale ?? 1}`}>
      <nav class="crumbs"><button class="back" onclick={() => { lesson = null; quizItems = []; }}>← {lessonRef.level.title ? loc(lessonRef.level.title) : lessonRef.level.id}</button> <span>{loc(lessonRef.topic.title)}</span></nav>
      <h3><span class="badge-level">{lessonRef.level.title ? loc(lessonRef.level.title) : lessonRef.level.id}</span> <span class="l-head" lang={lang.bcp47}>{lesson.title ?? lessonRef.entry.title}</span></h3>
      {#if lesson.meaning}<p class="l-sub">{loc(lesson.meaning)}</p>{/if}
      {#if lesson.kind === 'vocab' || lesson.kind === 'kanji'}
        <nav class="toc"><a href="#ex-start">{t('learn.exercises')}</a></nav>
        {#if lesson.kind === 'vocab'}
          <table class="words"><tbody>{#each lesson.words as w}<tr><td class="w" lang={lang.bcp47}>{#if w.reading}<ruby>{w.w}<rt>{w.reading}</rt></ruby>{:else}{w.w}{/if}</td><td class="r">{romanize ? romanize(w.reading ?? w.w) : ''}</td><td>{w.en}</td></tr>{/each}</tbody></table>
        {:else}
          <table class="words"><tbody>{#each lesson.kanji as k}<tr><td class="w big" lang={lang.bcp47}>{k.k}</td><td>{k.en}</td><td class="r">{k.on}</td><td class="r">{k.kun}</td><td class="r" lang={lang.bcp47}>{k.words.join('、')}</td></tr>{/each}</tbody></table>
        {/if}
      {:else}
        <nav class="toc">{#each lesson.sections as s}<a href={`#sec-${s.id}`}>{loc(s.title)}</a>{/each}{#if lesson.more?.length}<a href="#sec-more">{t('learn.more')}</a>{/if}{#if lesson.practice?.length}<a href="#sec-turn">{t('learn.yourTurn')}</a>{/if}<a href="#ex-start">{t('learn.exercises')}</a></nav>
        {#if loc(lesson.intro)}<div class="prose">{@html loc(lesson.intro)}</div>{/if}
        {#each lesson.sections as s}
          <section class="l-sec" id={`sec-${s.id}`} data-sec={s.id}>
            <h4>{loc(s.title)}</h4>
            <div class="prose">{@html loc(s.html)}</div>
            {#if s.id === 'examples' && lesson.examples?.length}
              <details class="examples-romaji"><summary>{t('learn.romaji')}</summary>
                <ol>{#each lesson.examples as ex}<li><span lang={lang.bcp47}>{ex.text}</span> — <i>{exampleRoman(ex)}</i>{#if openInReader} <button class="to-reader" onclick={() => openInReader(ex.text)}>{t('learn.read')}</button>{/if}</li>{/each}</ol>
              </details>
            {/if}
          </section>
        {/each}
        {#if lesson.more?.length}
          <!-- more examples: Tatoeba sentences that show the lesson's point (tools/learn_curriculum.mjs) -->
          <section class="l-sec more-examples" id="sec-more">
            <h4>{t('learn.more')}</h4>
            {#each lesson.more as ex}<div class="ex"><p class="ja" lang={lang.bcp47} dir="auto">{ex.text}</p>{#if ex.roman}<p class="r">{ex.roman}</p>{/if}<p class="en">{ui.lang === 'pt' && ex.pt ? ex.pt : ex.en}</p></div>{/each}
            <p class="more-source">Tatoeba (CC BY 2.0 FR)</p>
          </section>
        {/if}
        {#if lesson.practice?.length}
          <section class="l-sec your-turn" id="sec-turn">
            <h4>{t('learn.yourTurn')}</h4>
            {#each lesson.practice as p, k}<div class="turn"><div class="prose q"><b>{k + 1}.</b> {@html p.q}</div><details><summary>{t('learn.showAnswer')}</summary><div class="prose">{@html p.a}</div></details></div>{/each}
          </section>
        {/if}
      {/if}
      <section class="l-sec" id="ex-start">
        <h4>{t('learn.exercises')}</h4>
        {#if pct(lesson.id) !== null}<p class="pct-line">{t('learn.score', { pct: pct(lesson.id), n: progress[lesson.id].total })}</p>{/if}
        {#if !quizItems.length}<button class="start-exercises primary" onclick={startExercises}>{t('learn.practiceLesson')}</button>
        {:else}<p class="ex-count">{t('learn.exCount', { n: quizItems.length })}</p><ChoiceDrill items={quizItems} {random} {romanize} onresult={record} ordered />{/if}
      </section>
      <p class="source">{t('learn.source')}: {lesson.source === 'written for Casus' ? t('learn.writtenForCasus') : (lesson.source ?? loc(learn.credit))}</p>
      <nav class="prev-next">
        {#if neighbour(-1)}<button class="prev-lesson" data-lesson={neighbour(-1).entry.id} onclick={() => open(neighbour(-1))}>← <span lang={lang.bcp47}>{neighbour(-1).entry.title}</span></button>{/if}
        {#if neighbour(1)}<button class="next-lesson" data-lesson={neighbour(1).entry.id} onclick={() => open(neighbour(1))}><span lang={lang.bcp47}>{neighbour(1).entry.title}</span> →</button>{/if}
      </nav>
    </article>
  {:else}
    <!-- the level's topics, each with its lessons listed under it -->
    <div class="levels" role="tablist">
      {#each learn.levels as l}<button class="level-tab" data-level={l.id} class:active={l.id === levelId} aria-selected={l.id === levelId} onclick={() => { levelId = l.id; }}>{l.title ? loc(l.title) : l.id}<span class="count">{l.topics.filter((tp) => tp.kind === 'grammar').reduce((n, tp) => n + tp.lessons.length, 0)}</span></button>{/each}
    </div>
    <input class="search" type="search" bind:value={search} placeholder={t('learn.search')} />
    {#each level?.topics ?? [] as tp (tp.id)}
      {#if visible(tp).length}
        <details class="topic" data-kind={tp.kind} open={tp.kind === 'grammar' || !!search.trim()}>
          <summary><span class="topic-title">{tp.kind === 'grammar' ? loc(tp.title) : kindName(tp.kind)}</span> <span class="topic-n">{visible(tp).length}</span></summary>
          <ul class="lesson-list">
            {#each visible(tp) as e (e.id)}
              <li><button class="lesson-row" data-lesson={e.id} onclick={() => open({ level, topic: tp, entry: e })}>
                <span class="l-title" lang={lang.bcp47}>{e.title}</span><span class="l-meaning">{loc(e.meaning)}</span>
                {#if pct(e.id) !== null}<span class="pct" class:good={pct(e.id) >= 80}>{pct(e.id)}%</span>{/if}
              </button></li>
            {/each}
          </ul>
        </details>
      {/if}
    {/each}
  {/if}
  {#if learn}<p class="credit">{loc(learn.credit)}</p>{/if}
</section>

<style>
  .learn-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; }
  .learn-head h2 { margin: 0; }
  .system { color: var(--ink-2); font-size: 0.9em; }
  .modes { margin-left: auto; display: flex; gap: 4px; }
  .mode-tab, .level-tab { font: inherit; padding: 5px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--ink); cursor: pointer; }
  .mode-tab.active, .level-tab.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .levels { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 8px; }
  .count { font-size: 0.75em; opacity: 0.75; margin-left: 6px; }
  .search { width: 100%; box-sizing: border-box; font: inherit; padding: 7px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); margin-bottom: 8px; }
  .topic { border: 1px solid var(--line-soft); border-radius: 10px; margin: 8px 0; background: var(--panel); overflow: hidden; }
  .topic summary { cursor: pointer; padding: 9px 14px; font-weight: 700; display: flex; align-items: baseline; gap: 8px; background: var(--panel-hi); }
  .topic-n { font-weight: 400; font-size: 0.8em; color: var(--ink-2); margin-left: auto; }
  .topic[data-kind=vocab] summary { border-left: 4px solid #2e8b57; } .topic[data-kind=kanji] summary { border-left: 4px solid #9467bd; } .topic[data-kind=grammar] summary { border-left: 4px solid #1f77b4; }
  .lesson-list { list-style: none; margin: 0; padding: 0; }
  .lesson-list li + li { border-top: 1px solid var(--line-soft); }
  .lesson-row { width: 100%; display: grid; grid-template-columns: minmax(7em, auto) 1fr auto; gap: 4px 14px; align-items: baseline; text-align: left; font: inherit; padding: 8px 14px; border: 0; background: none; color: var(--ink); cursor: pointer; }
  .lesson-row:hover { background: var(--panel-hi); }
  @media (max-width: 600px) { .lesson-row { grid-template-columns: 1fr auto; } .l-meaning { grid-column: 1; } }
  .l-title { font-size: 1.12em; font-weight: 600; }
  .l-meaning { color: var(--ink-2); font-size: 0.92em; }
  .pct { font-size: 0.8em; color: #b06000; } .pct.good { color: #2e8b57; }
  .crumbs { color: var(--ink-2); font-size: 0.9em; display: flex; gap: 10px; align-items: center; }
  .back, .prev-lesson, .next-lesson, button.primary, .to-reader { font: inherit; padding: 5px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); cursor: pointer; }
  button.primary { border-color: var(--accent); font-weight: 600; }
  h3 { font-size: 1.9rem; margin: 10px 0 2px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .badge-level { font-size: 0.45em; padding: 2px 8px; border-radius: 6px; background: var(--accent); color: var(--accent-ink); }
  .l-sub { font-size: 1.15em; color: var(--ink-2); margin: 0 0 8px; }
  .toc { display: flex; flex-wrap: wrap; gap: 4px 12px; position: sticky; top: 0; background: var(--panel); padding: 6px 0; border-bottom: 1px solid var(--line-soft); z-index: 2; font-size: 0.92em; }
  .toc a { color: var(--accent); text-decoration: none; font-weight: 600; }
  .toc a:hover { text-decoration: underline; }
  .l-sec { margin-top: 18px; scroll-margin-top: 48px; }
  .l-sec h4 { font-size: 1.15em; margin: 0 0 6px; border-bottom: 2px solid var(--accent); display: inline-block; padding-bottom: 2px; }
  .prose :global(table) { border-collapse: collapse; margin: 8px 0; max-width: 100%; display: block; overflow-x: auto; }
  .prose :global(th), .prose :global(td) { border: 1px solid var(--line-soft); padding: 4px 10px; text-align: left; vertical-align: top; }
  .prose :global(th) { background: var(--panel-hi); }
  .prose :global(rt) { font-size: 0.55em; color: var(--ink-2); }
  .prose :global(code) { background: var(--panel-hi); padding: 0 4px; border-radius: 4px; font-family: inherit; font-weight: 600; }
  .prose :global(.ex) { border-left: 3px solid var(--line); padding: 4px 12px; margin: 8px 0; background: var(--panel-hi); border-radius: 0 8px 8px 0; }
  .prose :global(.ex .ja) { font-size: calc(1.2em * var(--script-scale, 1)); margin: 2px 0; line-height: 2; }
  .prose :global(.ex .ja b) { color: var(--accent); }
  .prose :global(.ex .en) { color: var(--ink-2); margin: 0; }
  .prose :global(.ex .r) { color: var(--ink-2); margin: 0; font-style: italic; }
  .prose :global(.note), .prose :global(.rule) { border: 1px solid var(--line-soft); border-left: 4px solid #ff7f0e; border-radius: 8px; padding: 2px 12px; margin: 8px 0; background: var(--panel-hi); }
  .prose :global(.rule) { border-left-color: #1f77b4; }
  .more-examples .ex { border-left: 3px solid var(--line); padding: 4px 12px; margin: 8px 0; background: var(--panel-hi); border-radius: 0 8px 8px 0; }
  .more-examples .ja { font-size: calc(1.15em * var(--script-scale, 1)); margin: 2px 0; } .more-examples .en, .more-examples .r { color: var(--ink-2); margin: 0; }
  .examples-romaji { margin-top: 6px; color: var(--ink-2); }
  .your-turn .turn { border-top: 1px dashed var(--line-soft); padding: 6px 0; }
  .your-turn summary { cursor: pointer; color: var(--accent); }
  .words { border-collapse: collapse; } .words td { border-bottom: 1px solid var(--line-soft); padding: 4px 10px; }
  .w { font-size: 1.2em; } .big { font-size: 1.7em; } .r { color: var(--ink-2); }
  .prev-next { display: flex; justify-content: space-between; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
  .next-lesson { margin-left: auto; }
  .range-box { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 12px 0; }
  .ex-count, .pct-line, .source, .more-source, .credit { color: var(--ink-2); font-size: 0.88em; }
</style>
