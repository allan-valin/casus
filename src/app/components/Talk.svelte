<script>
  /* Conversation practice (Allan, 2026-10-20/21; docs/PROPOSAL-2026-10-20-CONVERSATION-PRACTICE.md): a unit is a list
   * of steps, each with ▶; the narrator speaks the interface language, the characters the taught language; the
   * taught-language text stays hidden until clicked; a prompt asks first and gives its answer only on request, and
   * opens the pronunciation helper in place (Allan, 2026-10-21: no typing — it distracts from speaking); ▶ turns into
   * ⏸ while playing; the natural voices are offered before a unit instead of the robotic fallback; the last step
   * clicked stays highlighted; the unit ends with the four-in-five self-check. Units are written to the guide in
   * docs/conversation/ and built by tools/build_conversation.py. Progress is kept in this browser. */
  import { onMount } from 'svelte';
  import { t, ui } from '../lib/i18n.svelte.js';
  import { voicePitches, pitchOf } from '../lib/talkvoices.js';
  let { lang, loadTalk, storage = null, speakTaught = async () => {}, speakNarrator = async () => {}, trainerHref = null,
    say = () => {}, pause = (ms) => new Promise((r) => setTimeout(r, ms)), Practice = null, practiceProps = {}, control = null,
    voices = [], narratorVoiceOf = null } = $props();

  const GUIDE = 'https://github.com/allan-valin/casus/blob/main/docs/conversation';
  const GUIDES = [['en', 'English'], ['pt-BR', 'Português (Brasil)'], ['de', 'Deutsch'], ['mk', 'Македонски'], ['ar', 'العربية']];
  const KEY = `casus:talk:${lang.code}:done`;
  const NAMES = { en: 'English', pt: 'português', de: 'Deutsch', mk: 'македонски', ar: 'العربية' };

  let course = $state(null);
  let loaded = $state(false);
  let unit = $state(null);
  let shown = $state({});        // step index (or "index.line") → text revealed
  let done = $state(readDone());
  let current = $state(null);    // the step clicked last: highlighted so the learner keeps their place
  let playing = $state(null);    // the step whose sound is playing
  let paused = $state(false);
  let practising = $state(null); // the step whose pronunciation helper is open
  let gateClosed = $state(false);
  let fetching = $state(null);   // 0–100 while the natural voices download
  const HELP_KEY = 'casus:talk:help-seen';
  const helpOpen = (() => { try { return storage?.getItem(HELP_KEY) !== '1'; } catch { return true; } })();
  try { storage?.setItem(HELP_KEY, '1'); } catch { /* not kept */ }
  let tickVoices = $state(0);      // bumped after a download: naturalReady() reads the browser, not Svelte state
  const missing = $derived((tickVoices, [...new Set([...voices, narratorVoiceOf?.(narratorLang)])].filter((v) => v?.natural && !v.naturalReady?.())));
  const needVoices = $derived(!gateClosed && missing.length > 0);
  async function getVoices() {
    fetching = 0;
    const list = missing.slice();
    try {
      for (const [k, v] of list.entries()) await v.downloadNatural((x) => { fetching = Math.round(((k + x) / list.length) * 100); });
      say(t('talk.voices.got'), 'ok');
    } catch (e) { say(t('talk.voices.failed', { error: e?.message ?? '' }), 'err'); }
    fetching = null;
    tickVoices += 1;
  }

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
  const pitches = $derived(voicePitches(course));
  const firstDialogue = $derived(unit?.steps.find((s) => s.type === 'dialogue' && !s.again) ?? null);
  const linesOf = (s) => (s.again ? firstDialogue?.lines ?? [] : s.lines ?? []);

  function open(u) { unit = u; shown = {}; current = null; practising = null; say(t('talk.opened', { unit: nar(u.title) })); }
  function back() { unit = null; }
  function toggle(key) { shown = { ...shown, [key]: !shown[key] }; }

  async function sayTaught(text, who = null) {
    try { await speakTaught(text, { pitch: who ? pitchOf(course, unit, who, pitches) : 1 }); } catch (e) { say(t('talk.speakFailed', { text, error: e?.message ?? '' }), 'err'); throw e; }
  }
  // ▶ starts the step; while it plays the same button pauses (⏸) and resumes (▶) it
  async function waitWhilePaused() { while (paused && playing !== null) await new Promise((r) => setTimeout(r, 120)); }
  async function play(s, n) {
    current = n;
    if (playing === n) {
      if (paused) { paused = false; control?.resume?.(); say(t('talk.resumed')); } else { paused = true; control?.pause?.(); say(t('talk.paused')); }
      return;
    }
    playing = n;
    paused = false;
    try {
      if (s.type === 'narrator') { await speakNarrator(nar(s.text), narratorLang); say(t('talk.played.narrator')); }
      else if (s.type === 'dialogue') {
        for (const ln of linesOf(s)) { await waitWhilePaused(); if (playing !== n) break; await sayTaught(ln.text, ln.speaker); await pause(400); }
        say(t('talk.played.dialogue', { n: linesOf(s).length }));
      } else if (s.type === 'line') { await sayTaught(items[s.item]?.text ?? '', s.speaker); say(t('talk.played.line', { text: items[s.item]?.text ?? '' })); }
      else if (s.type === 'buildup') {
        for (const part of s.parts) { await waitWhilePaused(); if (playing !== n) break; await sayTaught(part); await pause(600); }
        say(t('talk.played.buildup', { text: s.parts.at(-1) }));
      } else if (s.type === 'prompt') { await speakNarrator(nar(s.ask), narratorLang); say(t('talk.played.ask')); }
    } catch { /* already reported */ }
    if (playing === n) { playing = null; paused = false; }
  }
  async function answer(s, n) {
    current = n;
    shown = { ...shown, [n]: true };
    try { await sayTaught(s.answer.text, s.answer.speaker ?? 'protagonist'); say(t('talk.played.answer', { text: s.answer.text })); } catch { /* reported */ }
  }
  function practise(n) { current = n; practising = practising === n ? null : n; }
  function markDone(ok) {
    if (ok && !done.includes(unit.id)) {
      done = [...done, unit.id];
      try { storage?.setItem(KEY, JSON.stringify(done)); } catch { /* not kept */ }
    }
    say(t(ok ? 'talk.selfcheck.yes.said' : 'talk.selfcheck.no.said'), ok ? 'ok' : undefined);
    if (!ok) { shown = {}; current = null; practising = null; }
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
    <details class="howto" open={helpOpen}>
      <summary>{t('talk.howto.title')}</summary>
      <div class="prose">{@html t('talk.howto.html')}</div>
    </details>
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
      {#if needVoices}
        <div class="voice-gate">
          <p>{t('talk.voices.need', { names: missing.map((v) => v.natural.name).join(', '), mb: missing.reduce((n, v) => n + (v.natural.sizeMB ?? 0), 0) })}</p>
          <button class="get-voices primary" disabled={fetching !== null} onclick={getVoices}>⬇ {t('talk.voices.get')}</button>
          {#if fetching !== null}<progress max="100" value={fetching}></progress>{/if}
          <button class="robot-anyway" onclick={() => (gateClosed = true)}>{t('talk.voices.robot')}</button>
        </div>
      {/if}
      <details class="howto"><summary>{t('talk.howto.title')}</summary><div class="prose">{@html t('talk.howto.html')}</div></details>
      <ol class="steps">
        {#each unit.steps as s, n}
          <li class="step" class:current={current === n} data-type={s.type}>
            {#if s.type !== 'selfcheck'}<button class="play" class:playing={playing === n && !paused} class:paused={playing === n && paused}
              aria-label={playing === n && !paused ? t('talk.pause') : t('talk.play')} title={playing === n && !paused ? t('talk.pause') : t('talk.play')}
              onclick={() => play(s, n)}>{playing === n && !paused ? '⏸' : '▶'}</button>{/if}
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
              {#if Practice}<button class="practise" aria-expanded={practising === n} onclick={() => practise(n)}>🎤 {t('talk.practise')}</button>{/if}
              {#if Practice && practising === n}<div class="practice"><Practice text={s.parts.at(-1)} {...practiceProps} /></div>{/if}
            {:else if s.type === 'prompt'}
              <span class="ask">{nar(s.ask)}</span>{#if s.review} <span class="review-tag">{t('talk.review')}</span>{/if}
              <span class="pause-hint">{t('talk.sayIt')}</span>
              <button class="answer" onclick={() => answer(s, n)}>{t('talk.answer')}</button>
              {#if Practice}<button class="practise" aria-expanded={practising === n} onclick={() => practise(n)}>🎤 {t('talk.practise')}</button>{/if}
              {#if shown[n]}<span class="taught" lang={lang.bcp47}>{s.answer.text}</span>{/if}
              {#if Practice && practising === n}<div class="practice"><Practice text={s.answer.text} {...practiceProps} /></div>{/if}
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
  .step.current { background: color-mix(in srgb, var(--accent, #6a4c93) 14%, transparent); border-radius: 8px; }
  .play.playing, .play.paused { outline: 2px solid var(--accent, #6a4c93); }
  .voice-gate { border: 1px solid var(--accent, #6a4c93); border-radius: 8px; padding: 8px 12px; margin: 8px 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .voice-gate p { flex-basis: 100%; margin: 0; }
  .howto { margin: 8px 0; }
  .practice { flex-basis: 100%; margin-top: 6px; }
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
