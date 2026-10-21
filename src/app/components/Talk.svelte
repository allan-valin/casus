<script>
  /* Conversation practice (Allan, 2026-10-20/21; docs/PROPOSAL-2026-10-20-CONVERSATION-PRACTICE.md): a unit is a list
   * of steps, each with ▶; the narrator speaks the interface language, the characters the taught language; the
   * taught-language text stays hidden until clicked; a prompt asks first and gives its answer only on request (or
   * checks a typed one); the unit ends with the four-in-five self-check. Units are written to the guide in
   * docs/conversation/ and built by tools/build_conversation.py. Progress is kept in this browser. */
  import { onMount } from 'svelte';
  import { t, ui } from '../lib/i18n.svelte.js';
  let { lang, loadTalk, storage = null, speakTaught = async () => {}, speakNarrator = async () => {}, trainerHref = null,
    say = () => {}, pause = (ms) => new Promise((r) => setTimeout(r, ms)) } = $props();

  const GUIDE = 'https://github.com/allan-valin/casus/blob/main/docs/conversation';
  const GUIDES = [['en', 'English'], ['pt-BR', 'Português (Brasil)'], ['de', 'Deutsch'], ['mk', 'Македонски'], ['ar', 'العربية']];
  const KEY = `casus:talk:${lang.code}:done`;
  const NAMES = { en: 'English', pt: 'português', de: 'Deutsch', mk: 'македонски', ar: 'العربية' };

  let course = $state(null);
  let loaded = $state(false);
  let unit = $state(null);
  let shown = $state({});        // step index (or "index.line") → text revealed
  let typed = $state({});
  let verdict = $state({});
  let done = $state(readDone());

  function readDone() {
    try { return JSON.parse(storage?.getItem(KEY) ?? '[]'); } catch { return []; }
  }
  onMount(async () => {
    try { course = await loadTalk(); } catch { course = null; }
    loaded = true;
  });

  const narratorLang = $derived(course ? (course.narrator_languages.includes(ui.lang) ? ui.lang : course.narrator_languages[0]) : ui.lang);
  const nar = (x) => (x == null ? '' : typeof x === 'string' ? x : (x[narratorLang] ?? Object.values(x)[0] ?? ''));
  const levels = $derived(course ? [...new Set(course.units.map((u) => u.level))] : []);
  const items = $derived(unit ? Object.fromEntries((unit.new_items ?? []).concat(course.items ?? []).map((i) => [i.id, i])) : {});
  const speaker = (id) => (id === 'protagonist' ? t('talk.you') : course?.cast?.[id]?.name ?? id);
  const firstDialogue = $derived(unit?.steps.find((s) => s.type === 'dialogue' && !s.again) ?? null);
  const linesOf = (s) => (s.again ? firstDialogue?.lines ?? [] : s.lines ?? []);

  function open(u) { unit = u; shown = {}; typed = {}; verdict = {}; say(t('talk.opened', { unit: nar(u.title) })); }
  function back() { unit = null; }
  function toggle(key) { shown = { ...shown, [key]: !shown[key] }; }

  async function sayTaught(text) {
    try { await speakTaught(text); } catch (e) { say(t('talk.speakFailed', { text, error: e?.message ?? '' }), 'err'); throw e; }
  }
  async function play(s, n) {
    try {
      if (s.type === 'narrator') { await speakNarrator(nar(s.text), narratorLang); say(t('talk.played.narrator')); }
      else if (s.type === 'dialogue') {
        for (const ln of linesOf(s)) { await sayTaught(ln.text); await pause(400); }
        say(t('talk.played.dialogue', { n: linesOf(s).length }));
      } else if (s.type === 'line') { await sayTaught(items[s.item]?.text ?? ''); say(t('talk.played.line', { text: items[s.item]?.text ?? '' })); }
      else if (s.type === 'buildup') {
        for (const part of s.parts) { await sayTaught(part); await pause(600); }
        say(t('talk.played.buildup', { text: s.parts.at(-1) }));
      } else if (s.type === 'prompt') { await speakNarrator(nar(s.ask), narratorLang); say(t('talk.played.ask')); }
    } catch { /* already reported */ }
  }
  async function answer(s, n) {
    shown = { ...shown, [n]: true };
    try { await sayTaught(s.answer.text); say(t('talk.played.answer', { text: s.answer.text })); } catch { /* reported */ }
  }
  const norm = (x) => String(x ?? '').toLowerCase().normalize('NFC').replace(/[\p{P}\s]+/gu, ' ').trim();
  function check(s, n) {
    const ok = norm(typed[n]) === norm(s.answer.text);
    verdict = { ...verdict, [n]: ok };
    say(t(ok ? 'talk.typed.right' : 'talk.typed.wrong', { text: s.answer.text }), ok ? 'ok' : undefined);
  }
  function markDone(ok) {
    if (ok && !done.includes(unit.id)) {
      done = [...done, unit.id];
      try { storage?.setItem(KEY, JSON.stringify(done)); } catch { /* not kept */ }
    }
    say(t(ok ? 'talk.selfcheck.yes.said' : 'talk.selfcheck.no.said'), ok ? 'ok' : undefined);
    if (!ok) { shown = {}; typed = {}; verdict = {}; }
  }
</script>

{#snippet taught(key, text, meaning)}
  <button class="reveal" aria-expanded={!!shown[key]} onclick={() => toggle(key)}>{shown[key] ? t('talk.hide') : t('talk.show')}</button>
  {#if shown[key]}
    <span class="taught" lang={lang.bcp47}>{text}</span>{#if meaning}<span class="meaning">{meaning}</span>{/if}
    {#if trainerHref}<a class="trainer" href={trainerHref(text)} title={t('talk.trainer')}>🎤</a>{/if}
  {/if}
{/snippet}

<section class="card talk">
  <h2>{t('talk.heading')}</h2>
  {#if !loaded}
    <p>{t('talk.loading')}</p>
  {:else if !course}
    <p class="talk-none">{t('talk.none', { language: lang.name?.[ui.lang] ?? lang.name?.en ?? '' })}</p>
    <p>{t('talk.guide.intro')}</p>
    <ul class="guides">{#each GUIDES as [code, name]}<li><a class="guide" href={`${GUIDE}/GUIDE.${code}.md`} target="_blank" rel="noopener">{name}</a></li>{/each}</ul>
  {:else if !unit}
    {#if course.example}<p class="talk-example">{t('talk.example')}</p>{/if}
    {#if narratorLang !== ui.lang}<p class="narrator-fallback">{t('talk.narratorFallback', { lang: NAMES[narratorLang] ?? narratorLang })}</p>{/if}
    {#each levels as level}
      <h3 class="level">{level}</h3>
      <ul class="units">
        {#each course.units.filter((u) => u.level === level) as u (u.id)}
          <li><button class="unit-row" class:done={done.includes(u.id)} data-unit={u.id} onclick={() => open(u)}>
            <span class="u-id">{u.id}</span> <span class="u-title">{nar(u.title)}</span>{#if done.includes(u.id)} <span class="tick">✓</span>{/if}
          </button></li>
        {/each}
      </ul>
    {/each}
    <p class="guide-line">{t('talk.guide.write')} <a class="guide" href={`${GUIDE}/GUIDE.${ui.lang === 'pt' ? 'pt-BR' : ui.lang}.md`} target="_blank" rel="noopener">{t('talk.guide.link')}</a></p>
  {:else}
    <div class="unit-page">
      <button class="back" onclick={back}>← {t('talk.back')}</button>
      <h3>{unit.id} · {nar(unit.title)}</h3>
      <p class="situation">{nar(unit.situation)}</p>
      <ol class="steps">
        {#each unit.steps as s, n}
          <li class="step" data-type={s.type}>
            {#if s.type !== 'selfcheck'}<button class="play" aria-label={t('talk.play')} onclick={() => play(s, n)}>▶</button>{/if}
            {#if s.type === 'narrator'}
              <span class="narration">{nar(s.text)}</span>
            {:else if s.type === 'dialogue'}
              <span class="kind">{s.again ? t('talk.dialogue.again') : t('talk.dialogue')}</span>
              <button class="reveal" aria-expanded={!!shown[n]} onclick={() => toggle(n)}>{shown[n] ? t('talk.hide') : t('talk.show')}</button>
              {#if shown[n]}
                <ul class="lines">{#each linesOf(s) as ln}<li><b class="who">{speaker(ln.speaker)}:</b> <span class="taught" lang={lang.bcp47}>{ln.text}</span> <span class="meaning">{nar(ln.meaning)}</span>
                  {#if trainerHref}<a class="trainer" href={trainerHref(ln.text)} title={t('talk.trainer')}>🎤</a>{/if}</li>{/each}</ul>
              {/if}
            {:else if s.type === 'line'}
              <b class="who">{speaker(s.speaker)}</b> {@render taught(n, items[s.item]?.text ?? '', nar(items[s.item]?.meaning))}
            {:else if s.type === 'buildup'}
              <span class="kind">{t('talk.buildup')}</span>
              <button class="reveal" aria-expanded={!!shown[n]} onclick={() => toggle(n)}>{shown[n] ? t('talk.hide') : t('talk.show')}</button>
              {#if shown[n]}<span class="taught" lang={lang.bcp47}>{s.parts.join(' … ')}</span>{/if}
            {:else if s.type === 'prompt'}
              <span class="ask">{nar(s.ask)}</span>{#if s.review} <span class="review-tag">{t('talk.review')}</span>{/if}
              <span class="pause-hint">{t('talk.sayIt')}</span>
              <span class="typing"><input class="typed" lang={lang.bcp47} placeholder={t('talk.typeIt')} value={typed[n] ?? ''} oninput={(e) => (typed = { ...typed, [n]: e.currentTarget.value })} onkeydown={(e) => e.key === 'Enter' && check(s, n)} />
                <button class="check" onclick={() => check(s, n)}>{t('talk.check')}</button>
                {#if verdict[n] != null}<span class="verdict" data-ok={String(verdict[n])}>{verdict[n] ? '✓' : '✗'}</span>{/if}</span>
              <button class="answer" onclick={() => answer(s, n)}>{t('talk.answer')}</button>
              {#if shown[n]}<span class="taught" lang={lang.bcp47}>{s.answer.text}</span>
                {#if trainerHref}<a class="trainer" href={trainerHref(s.answer.text)} title={t('talk.trainer')}>🎤</a>{/if}{/if}
            {:else if s.type === 'selfcheck'}
              <span class="kind">{t('talk.selfcheck')}</span>
              <button class="done-yes" onclick={() => markDone(true)}>{t('talk.selfcheck.yes')}</button>
              <button class="done-no" onclick={() => markDone(false)}>{t('talk.selfcheck.no')}</button>
            {/if}
          </li>
        {/each}
      </ol>
    </div>
  {/if}
</section>

<style>
  .talk h3.level { margin: 14px 0 4px; }
  .units { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
  .unit-row { width: 100%; text-align: start; padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--card, transparent); color: var(--ink); cursor: pointer; }
  .unit-row:hover { border-color: var(--accent); }
  .unit-row.done { border-color: var(--accent); }
  .u-id { font-variant-numeric: tabular-nums; color: var(--ink-2); }
  .tick { color: var(--accent-text); font-weight: 700; }
  .talk-example, .narrator-fallback { color: var(--ink-2); font-size: 0.92rem; }
  .steps { padding-inline-start: 1.6em; display: grid; gap: 8px; }
  .step { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
  .play { border-radius: 999px; width: 2.2em; height: 2.2em; border: 1px solid var(--accent); background: transparent; color: var(--accent-text); cursor: pointer; }
  .reveal, .answer, .check, .back, .done-yes, .done-no { border: 1px solid var(--line); border-radius: 999px; padding: 2px 12px; background: transparent; color: var(--ink); cursor: pointer; }
  .taught { font-weight: 600; font-size: 1.08rem; }
  .meaning { color: var(--ink-2); font-style: italic; }
  .kind, .pause-hint { color: var(--ink-2); font-size: 0.9rem; }
  .review-tag { font-size: 0.78rem; border: 1px solid var(--line); border-radius: 999px; padding: 0 8px; color: var(--ink-2); }
  .lines { list-style: none; padding: 0; margin: 4px 0 0; width: 100%; display: grid; gap: 2px; }
  .typed { min-width: 12em; padding: 3px 8px; border: 1px solid var(--line); border-radius: 6px; background: transparent; color: var(--ink); }
  .verdict[data-ok="true"] { color: var(--ok, green); font-weight: 700; }
  .verdict[data-ok="false"] { color: var(--err, #b00); font-weight: 700; }
  .trainer { text-decoration: none; }
</style>
