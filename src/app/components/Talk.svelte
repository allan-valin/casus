<script>
  /* Conversation practice (Allan, 2026-10-20/21; docs/PROPOSAL-2026-10-20-CONVERSATION-PRACTICE.md): a unit is a list
   * of steps, each with ▶; the narrator speaks the interface language, the characters the taught language; the
   * taught-language text stays hidden until clicked; a prompt asks first and gives its answer only on request, and
   * opens the pronunciation helper in place (Allan, 2026-10-21: no typing — it distracts from speaking); ▶ turns into
   * ⏸ while playing; the natural voices are offered before a unit instead of the robotic fallback; the last step
   * clicked stays highlighted; the unit ends with the four-in-five self-check. Units are written to the guide in
   * docs/conversation/ and built by tools/build_conversation.py. Progress is kept in this browser. */
  import { onMount } from 'svelte';
  import Picker from './Picker.svelte';
  import { alignFurigana } from '../../lang/ja/furigana.js';
  import { t, ui, setLang } from '../lib/i18n.svelte.js';
  import { voicePitches, pitchOf, speedOf, speakerOf } from '../lib/talkvoices.js';
  import { narrationParts, taughtLetters } from '../lib/narration.js';
  let { lang, loadTalk, storage = null, speakTaught = async () => {}, speakNarrator = async () => {}, trainerHref = null,
    say = () => {}, pause = (ms) => new Promise((r) => setTimeout(r, ms)), Practice = null, practiceProps = {}, control = null,
    voices = [], narratorVoiceOf = null, Entry = null, entryProps = {}, VoiceBox = null, kanjiHref = null,
    loadLearn = null, lessonHref = null, inDevelopment = false, startUnit = null } = $props();

  const GUIDE = 'https://github.com/allan-valin/casus/blob/main/docs/conversation';
  const GUIDES = [['en', 'English'], ['pt-BR', 'Português (Brasil)'], ['de', 'Deutsch'], ['mk', 'Македонски'], ['ar', 'العربية']];
  const KEY = `casus:talk:${lang.code}:done`;
  const OWN_NAMES = { en: 'English', pt: 'Português (Brasil)', de: 'Deutsch', mk: 'Македонски', ar: 'العربية' };
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
  // every voice this course uses, for the ⚙ panel (download, delete, download again — Allan, 2026-10-21)
  const allVoices = $derived([...new Set([...voices, narratorVoiceOf?.(narratorLang)])].filter((v) => v?.natural));
  async function getVoices() {
    fetching = 0;
    const list = missing.slice();
    try {
      for (const [k, v] of list.entries()) await v.downloadNatural((x) => { fetching = Math.round(((k + x) / list.length) * 100); }, { onAttempt: (n, why) => { if (n > 1) say(t('talk.voices.retry', { name: v.natural.name, n, why })); } });
      say(t('talk.voices.got'), 'ok');
    } catch (e) { say(t('talk.voices.failed', { error: e?.message ?? '' }), 'err'); }
    fetching = null;
    tickVoices += 1;
  }

  function readDone() {
    try { return JSON.parse(storage?.getItem(KEY) ?? '[]'); } catch { return []; }
  }
  onMount(async () => {
    // lv: the lesson's level, by position (A1 = 0 … / N5 = 0 …), for its tag colour
    loadLearn?.().then((L) => { learnIndex = Object.fromEntries((L?.levels ?? []).flatMap((l, lv) => l.topics.flatMap((tp) => tp.lessons.map((e) => [e.id, { ...e, lv }])))); }).catch(() => {});
    try { course = await loadTalk(); } catch { course = null; }
    loaded = true;
    // a link names a unit's slot (A1-02) or id (A1-02-e): open this audience's version (Learn links here, 2026-10-27)
    const start = startUnit && shownUnits.find((u) => u.id === startUnit || slot(u.id) === startUnit);
    if (start) open(start);
  });
  // each unit is tagged with the Learn lessons it practises; a search looks in every level (Allan, 2026-10-27)
  let learnIndex = $state({});
  let search = $state('');
  const tagsOf = (u) => (u.learn_lessons ?? []).map((id) => learnIndex[id]).filter(Boolean);
  // the lessons of the items a unit reviews, from the unit that taught each item: every topic it touches shows
  const taughtIn = $derived(Object.fromEntries((course?.units ?? []).flatMap((u) => (u.new_items ?? []).map((i) => [i.id, u]))));
  const allTags = (u) => {
    const own = tagsOf(u);
    const seen = new Set(own.map((e) => e.id));
    const reviewed = (u.reviews ?? []).flatMap((r) => tagsOf(taughtIn[r.item] ?? {})).filter((e) => !seen.has(e.id) && seen.add(e.id));
    return [...own.map((e) => ({ e, reviewed: false })), ...reviewed.map((e) => ({ e, reviewed: true }))];
  };
  // what a search reads in a unit: its words too (items, dialogue lines, answers), not only titles (Allan, 2026-10-27)
  const unitText = (u) => [u.id, nar(u.title), nar(u.situation), ...tagsOf(u).flatMap((e) => [e.title, meaningOf(e)]),
    ...(u.new_items ?? []).flatMap((i) => [i.text, nar(i.meaning)]),
    ...(u.steps ?? []).flatMap((st) => [...(st.lines ?? []).flatMap((ln) => [ln.text, nar(ln.meaning)]), st.answer?.text])]
    .map((x) => String(x ?? '')).join(' ').toLowerCase().replace(/[.,!?;:«»„“”"…¿¡()]/g, ' ');
  const meaningOf = (e) => (typeof e.meaning === 'string' ? e.meaning : (e.meaning?.[ui.lang] ?? e.meaning?.en ?? ''));
  const found = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const words = q.replace(/[.,!?;:«»„“”"…¿¡()]/g, ' ').split(/\s+/).filter(Boolean);
    return shownUnits.filter((u) => { const text = unitText(u); return words.every((w) => text.includes(w)); });
  });

  const narratorLang = $derived(course ? (course.narrator_languages.includes(ui.lang) ? ui.lang : course.narrator_languages[0]) : ui.lang);
  const nar = (x) => (x == null ? '' : typeof x === 'string' ? x : (x[narratorLang] ?? Object.values(x)[0] ?? ''));
  // a unit or a narrator step may be for some audiences only (tracks / for: narrator languages); the rest is neutral
  const forMe = (x) => !x || x.includes(narratorLang);
  const shownUnits = $derived(course ? course.units.filter((u) => forMe(u.tracks)) : []);
  const levels = $derived([...new Set(shownUnits.map((u) => u.level))]);
  // levels are tabs (Allan, 2026-10-22): one level at a time, no reload; opens where you left off, remembers your pick
  const LEVEL_KEY = `casus:talk:${lang.code}:level`;
  let pickedLevel = $state((() => { try { return storage?.getItem(LEVEL_KEY) ?? null; } catch { return null; } })());
  const level = $derived(levels.includes(pickedLevel) ? pickedLevel
    : (shownUnits.find((u) => !done.includes(u.id))?.level ?? levels[levels.length - 1] ?? null));
  function pickLevel(l) { pickedLevel = l; try { storage?.setItem(LEVEL_KEY, l); } catch { /* not kept */ } }
  const doneIn = (l) => shownUnits.filter((u) => u.level === l && done.includes(u.id)).length;
  // a course may name its levels after its own exam (Korean: TOPIK 1 …)
  const lvName = (l) => lang.levelNames?.[l] ?? l;
  const countIn = (l) => shownUnits.filter((u) => u.level === l).length;
  const firstReview = $derived(unit ? unit.steps.findIndex((st) => st.review) : -1);
  const items = $derived(unit ? Object.fromEntries((unit.new_items ?? []).concat(course.items ?? []).map((i) => [i.id, i])) : {});
  const speaker = (id) => (id === 'protagonist' ? t('talk.you') : course?.cast?.[id]?.name ?? id);
  const pitches = $derived(voicePitches(course));
  // the taught language's alphabet, from its first dialogue line (Latin-script courses: only «…» marks taught words)
  const letters = $derived(taughtLetters(course?.language, course?.units?.flatMap((u) => u.steps ?? []).find((x) => x.lines?.length)?.lines[0].text));
  const firstDialogue = $derived(unit?.steps.find((s) => s.type === 'dialogue' && !s.again) ?? null);
  const linesOf = (s) => (s.again ? firstDialogue?.lines ?? [] : s.lines ?? []);

  const slot = (id) => String(id).replace(/^([ABC][12]-\d+)-[a-z]+$/, '$1');   // audience versions: A1-02-e → A1-02
  // leaving or opening a unit stops its sound: steps are told apart by number only, so a paused step 2 would otherwise
  // resume when the next unit's step 2 is clicked (Allan 2026-10-28)
  function open(u) { if (playing !== null || chainWaiting || paused) stopAll(); unit = { ...u, steps: u.steps.filter((x) => forMe(x.for)) }; shown = {}; current = null; practising = null; say(t('talk.opened', { unit: nar(u.title) })); }
  function back() { if (playing !== null || chainWaiting || paused) stopAll(); unit = null; }
  function toggle(key) { shown = { ...shown, [key]: !shown[key] }; }

  // the natural voice failing must show (Allan, 2026-10-21: "still the robot voice"): once per unit, with the reason
  let warnedFallback = false;
  function noteFallback(r) {
    if (r?.fellBack && !warnedFallback) { warnedFallback = true; say(t('talk.voice.fellBack', { error: r.error ?? '' }), 'err'); }
  }
  async function sayTaught(text, who = null) {
    try { noteFallback(await speakTaught(readings[text]?.say ?? text, { pitch: who ? pitchOf(course, unit, who, pitches) : 1, speed: who ? speedOf(course, unit, who) : 1,
      ...(soundsOf(text) ? { phonemes: soundsOf(text) } : {}), ...(who && speakerOf(course, unit, who) ? { speaker: speakerOf(course, unit, who) } : {}) })); } catch (e) { say(t('talk.speakFailed', { text, error: e?.message ?? '' }), 'err'); throw e; }
  }
  // ▶ starts the step; while it plays the same button pauses (⏸) and resumes (▶) it
  // every playback has a run number; starting another stops the sound and ends the old run (Allan, 2026-10-21: two at once)
  let run = 0;
  async function waitWhilePaused(my) { while (paused && my === run) await new Promise((r) => setTimeout(r, 120)); }
  // narration with words of the taught language: those go to the taught voice (Allan, 2026-10-21: the Portuguese voice
  // spelled Cyrillic letter by letter). Quoted words in another alphabet are found by themselves; «…» marks any.
  const shownNarration = (text) => String(text ?? '').replace(/«([^»]+)»/g, '$1');
  async function narrate(text, my) {
    for (const part of narrationParts(text, letters)) {
      if (my !== undefined && my !== run) break;
      if (part.taught) await sayTaught(part.text);
      else noteFallback(await speakNarrator(part.text, narratorLang));
    }
  }
  // one step's sound. Hands-free (Allan, 2026-10-21) is a mode switch, not start/stop: while it is on, a step that ends by
  // itself is followed by the next (a question gets THINK_MS to answer aloud, then its answer); switching it on or off
  // never interrupts or restarts what is playing. A pause holds the run; ⏮/⏭, the lock screen or another ▶ move it.
  const THINK_MS = 5000;   // Allan, 2026-10-21: five seconds is enough
  let handsFree = $state(false);
  let chainWaiting = $state(false);   // between two steps of a hands-free run
  async function holding(my) { while (paused && handsFree && my === run) await new Promise((r) => setTimeout(r, 120)); }
  async function perform(s, n) {
    if (playing !== null) control?.stop?.();   // only when something plays: a chained step starts in silence
    const my = ++run;
    playing = n;
    paused = false;
    chainWaiting = false;
    try {
      if (s.type === 'narrator') { await narrate(nar(s.text), my); say(t('talk.played.narrator')); }
      else if (s.type === 'dialogue') {
        for (const ln of linesOf(s)) { await waitWhilePaused(my); if (my !== run) break; await sayTaught(ln.text, ln.speaker); if (my !== run) break; await pause(400); }
        say(t('talk.played.dialogue', { n: linesOf(s).length }));
      } else if (s.type === 'line') { await sayTaught(items[s.item]?.text ?? '', s.speaker); say(t('talk.played.line', { text: items[s.item]?.text ?? '' })); }
      else if (s.type === 'buildup') {
        for (const part of s.parts) { await waitWhilePaused(my); if (my !== run) break; await sayTaught(part); if (my !== run) break; await pause(handsFree ? 2500 : 600); }
        say(t('talk.played.buildup', { text: s.parts.at(-1) }));
      } else if (s.type === 'prompt') {
        await narrate(nar(s.ask), my); say(t('talk.played.ask'));
        if (handsFree && my === run) {
          await waitWhilePaused(my); if (my === run) await pause(THINK_MS); await waitWhilePaused(my);
          if (my === run) await answer(s, n, true);
        }
      }
    } catch { /* already reported */ }
    if (my !== run) return;                       // replaced or stopped: no chain
    playing = null;
    if (!handsFree) { paused = false; return; }
    // hands-free: the next step follows
    chainWaiting = true;
    await holding(my);
    if (handsFree && my === run) await pause(800);
    await holding(my);
    chainWaiting = false;
    if (!handsFree || my !== run) return;
    const k = n + 1;
    if (k >= unit.steps.length) return;
    current = k;
    if (unit.steps[k].type === 'selfcheck') return;
    await perform(unit.steps[k], k);
  }
  function stopAll() { control?.stop?.(); run += 1; playing = null; paused = false; chainWaiting = false; }
  async function play(s, n) {
    current = n;
    if (playing === n) {
      if (paused) { paused = false; control?.resume?.(); say(t('talk.resumed')); } else { paused = true; control?.pause?.(); say(t('talk.paused')); }
      return;
    }
    await perform(s, n);
  }
  function toggleHandsFree() {
    handsFree = !handsFree;
    say(t(handsFree ? 'talk.handsFree.on' : 'talk.handsFree.off'));
  }
  function stepTo(k) {
    if (!unit) return;
    const to = Math.max(0, Math.min(unit.steps.length - 1, k));
    stopAll();
    current = to;
    if (unit.steps[to].type !== 'selfcheck') perform(unit.steps[to], to);
  }
  const next = () => stepTo(current == null ? 0 : current + 1);
  const prev = () => stepTo(current == null ? 0 : current - 1);
  function playPause() {
    if (playing !== null) { play(unit.steps[playing], playing); return; }
    if (chainWaiting) { paused = !paused; say(t(paused ? 'talk.paused' : 'talk.resumed')); return; }   // between two steps
    stepTo(current ?? 0);
  }
  // tell the phone the real state, so its button shows the right thing
  $effect(() => {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : null;
    if (!ms) return;
    try { ms.playbackState = paused ? 'paused' : (playing !== null || chainWaiting) ? 'playing' : 'none'; } catch { /* old browsers */ }
  });
  // the lock screen / notification controls (Media Session API), while a unit is open
  $effect(() => {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : null;
    if (!ms || !unit) return;
    try {
      if (typeof MediaMetadata !== 'undefined') ms.metadata = new MediaMetadata({ title: `${unit.id} · ${nar(unit.title)}`, artist: 'Casus', album: t('talk.heading') });
      // play and pause are commands, not toggles: phones send them on their own (Allan, 2026-10-21: hands-free
      // "pressed play twice and skipped")
      ms.setActionHandler('play', () => { if ((playing === null && !chainWaiting) || paused) playPause(); });
      ms.setActionHandler('pause', () => { if (!paused && (playing !== null || chainWaiting)) playPause(); });
      ms.setActionHandler('nexttrack', () => next());
      ms.setActionHandler('previoustrack', () => prev());
      // some phones show seek buttons instead of track buttons: both move between steps (Allan, 2026-10-21)
      try { ms.setActionHandler('seekforward', () => next()); ms.setActionHandler('seekbackward', () => prev()); } catch { /* not supported */ }
    } catch { /* not supported */ }
    return () => { for (const a of ['play', 'pause', 'nexttrack', 'previoustrack', 'seekforward', 'seekbackward']) try { ms.setActionHandler(a, null); } catch { /* fine */ } };
  });
  async function answer(s, n, inner = false) {
    if (!inner) stopAll();
    current = n;
    shown = { ...shown, [n]: true };
    try { await sayTaught(s.answer.text, s.answer.speaker ?? 'protagonist'); say(t('talk.played.answer', { text: s.answer.text })); } catch { /* reported */ }
  }
  // shown words open their dictionary entry; non-Latin text gets its romanization below (Allan, 2026-10-21)
  let entry = $state(null);      // { key, word }
  const romanize = $derived(lang.script?.romanize ?? null);
  const pieces = (text) => (String(text).match(/[\p{L}\p{M}]+|[^\p{L}\p{M}]+/gu) ?? []).map((x) => ({ x, word: /\p{L}/u.test(x) }));
  const romanOf = (text) => pieces(text).map((p) => (p.word ? romanize(p.x) : p.x)).join('');
  // Japanese lines carry their words with readings (tools/ja_text.py): furigana over kanji, romaji with the particles
  // read as particles, the voice given kana (Allan, 2026-10-22)
  const readings = $derived(course?.readings ?? {});
  // the sounds a line is said with, computed by the build: Japanese in readings[text].ph, Korean in sounds[text]
  const soundsOf = (text) => readings[text]?.ph ?? course?.sounds?.[text] ?? null;
  // what the pronunciation compare expects: Korean in standard IPA (course.ipa), not espeak's symbols for the voice
  const compareOf = (text) => readings[text]?.ph ?? course?.ipa?.[text] ?? course?.sounds?.[text] ?? null;
  const HAS_KANJI = /[\u3005\u4e00-\u9fff\u3400-\u4dbf]/u;
  const PARTICLE = { は: 'wa', へ: 'e', を: 'o' };
  const JPUNCT = { '。': '.', '、': ',', '！': '!', '？': '?', '「': '“', '」': '”', '・': ' ' };
  const isPunct = (w) => !/[\p{L}\p{N}]/u.test(w);
  function romanRich(rt) {
    let out = '';
    for (const [w, r] of rt) {
      if (isPunct(w)) { out += [...w].map((c) => JPUNCT[c] ?? c).join(''); continue; }
      out += (out && !out.endsWith(' ') && !out.endsWith('“') ? ' ' : '') + (PARTICLE[w] ?? (romanize ? romanize(r ?? w) : r ?? w));
    }
    return out;
  }
  function openWord(key, word) { entry = entry?.key === key && entry.word === word ? null : { key, word }; }
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

{#snippet icon(kind)}
  <!-- drawn, not font glyphs: a glyph sits differently on every device's font (Allan, 2026-10-21) -->
  <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">
    {#if kind === 'play'}<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>
    {:else if kind === 'pause'}<rect x="6.5" y="5.5" width="4" height="13" rx="1" fill="currentColor"/><rect x="13.5" y="5.5" width="4" height="13" rx="1" fill="currentColor"/>
    {:else if kind === 'prev'}<rect x="5.5" y="6" width="2.5" height="12" rx="1" fill="currentColor"/><path d="M19 6v12l-9.5-6z" fill="currentColor"/>
    {:else}<path d="M5 6v12l9.5-6z" fill="currentColor"/><rect x="16" y="6" width="2.5" height="12" rx="1" fill="currentColor"/>{/if}
  </svg>
{/snippet}

{#snippet unitList(list, role = undefined)}
  <ul class="units" {role}>
    {#each list as u (u.id)}
      <li class="unit-item" data-unit={u.id}><button class="unit-row" class:done={done.includes(u.id)} data-unit={u.id} onclick={() => open(u)}>
        <span class="u-id">{slot(u.id)}</span> <span class="u-title">{nar(u.title)}</span>{#if done.includes(u.id)} <span class="tick">✓</span>{/if}
      </button>
        {#if allTags(u).length}<span class="u-tags">{@render tagList(allTags(u), 'u-tag')}</span>{/if}</li>
    {/each}
  </ul>
{/snippet}

{#snippet tagList(tags, cls)}
  {#each tags as { e, reviewed }}{#if lessonHref}<a class={cls} class:reviewed data-lv={e.lv} href={lessonHref(e.id)} title={(reviewed ? `${t('talk.review')}: ` : '') + meaningOf(e)}>{e.title}</a>{:else}<span class={cls} class:reviewed data-lv={e.lv} title={meaningOf(e)}>{e.title}</span>{/if} {/each}
{/snippet}

{#snippet gearPanel()}
  {#if VoiceBox && allVoices.length}
    <details class="voice-gear"><summary>⚙ {t('talk.voices.gear')}</summary>
      {#each allVoices as v}<VoiceBox voice={v} onaction={(kind, detail) => { tickVoices += 1; if (kind === 'retry') say(t('talk.voices.retry', { name: v.natural.name, n: detail.split(':')[0], why: detail.split(': ').slice(1).join(': ') })); else if (kind === 'failed') say(t('talk.voices.failed', { error: detail ?? '' }), 'err'); }} />{/each}
    </details>
  {/if}
{/snippet}

<!-- a unit's kanji, each linked to the Learn kanji lesson that drills it (Allan, 2026-10-22) -->
{#snippet kanjiList(list, cls, label)}
  <p class={cls}><span class="kanji-label">{t(label)}</span>
    {#each list as x}{#if x.lesson && kanjiHref}<a class="kanji" lang="ja" href={kanjiHref(x.lesson)}>{x.k}</a>{:else}<span class="kanji" lang="ja">{x.k}</span>{/if} {/each}</p>
{/snippet}
{#snippet ruby(w, r)}{#if HAS_KANJI.test(w)}{#each alignFurigana(w, r) as [c, cr]}{#if cr}<ruby>{c}<rt>{cr}</rt></ruby>{:else}{c}{/if}{/each}{:else}{w}{/if}{/snippet}

{#snippet words(key, text)}
  {#if readings[text]}
    <span class="taught" lang={lang.bcp47}>{#each readings[text].rt as [w, r]}{#if !isPunct(w) && Entry}<button class="w" onclick={() => openWord(key, w)}>{@render ruby(w, r)}</button>{:else}{@render ruby(w, r)}{/if}{/each}</span><span class="roman">{romanRich(readings[text].rt)}</span>
  {:else}
  <span class="taught" lang={lang.bcp47}>{#each pieces(text) as p}{#if p.word && Entry}<button class="w" onclick={() => openWord(key, p.x)}>{p.x}</button>{:else}{p.x}{/if}{/each}</span>{#if romanize}<span class="roman">{romanOf(text)}</span>{/if}
  {/if}
  {#if Entry && entry?.key === key}<div class="entry"><Entry word={entry.word} {lang} {...entryProps} onclose={() => (entry = null)} /></div>{/if}
{/snippet}

{#snippet taught(key, text, meaning)}
  <button class="reveal" aria-expanded={!!shown[key]} onclick={() => toggle(key)}>{shown[key] ? t('talk.hide') : t('talk.show')}</button>
  {#if shown[key]}
    {@render words(key, text)}{#if meaning}<span class="meaning">{meaning}</span>{/if}
    {#if trainerHref}<a class="trainer" href={trainerHref(text)} title={t('talk.trainer')}>🎤</a>{/if}
  {/if}
{/snippet}

<section class="card talk">
  <h2>{t('talk.heading')}</h2>
  {#if !loaded}
    <p>{t('talk.loading')}</p>
  {:else if !course}
    <p class="talk-none not-yet" role="note">{t('talk.none', { language: lang.name?.[ui.lang] ?? lang.name?.en ?? '' })}</p>
    <p>{t('talk.guide.intro')}</p>
    <ul class="guides">{#each GUIDES as [code, name]}<li><a class="guide" href={`${GUIDE}/GUIDE.${code}.md`} target="_blank" rel="noopener">{name}</a></li>{/each}</ul>
  {:else if !course.narrator_languages.includes(ui.lang)}
    <!-- the course is narrated in other languages: say which, each a link that switches (Allan, 2026-10-27) -->
    <div class="only-in">
      <p>{t('talk.onlyIn')}</p>
      <ul>{#each course.narrator_languages as code}<li><a href={`?ui=${code}`} lang={code === 'pt' ? 'pt-BR' : code} onclick={(ev) => { ev.preventDefault(); setLang(code); }}>{OWN_NAMES[code] ?? code}</a></li>{/each}</ul>
    </div>
  {:else if !unit}
    {#if inDevelopment || course?.in_development}<p class="in-dev" role="note"><strong>{t('talk.dev.title')}</strong> {t('talk.dev.body', { report: t('app.report') })}</p>{/if}
    {@render gearPanel()}
    <details class="howto" open={helpOpen}>
      <summary>{t('talk.howto.title')}</summary>
      <div class="prose">{@html t('talk.howto.html')}</div>
    </details>
    {#if course.example}<p class="talk-example">{t('talk.example')}</p>{/if}
    <!-- the levels under one button showing the current one and its progress (Allan, 2026-10-22) -->
    <div class="level-tabs">
      <Picker cls="level-picker" label={level ? `${lvName(level)} · ${doneIn(level)}/${countIn(level)}` : ''} title={t('level.pick')}>
        {#each levels as l}
          <button class="level-tab" data-level={l} aria-selected={l === level} class:active={l === level} onclick={() => pickLevel(l)}>
            {lvName(l)} <span class="level-count">{doneIn(l)}/{countIn(l)}</span>
          </button>
        {/each}
      </Picker>
    </div>
    <input class="talk-search" type="search" bind:value={search} placeholder={t('talk.search')} />
    {#if found}
      {#each levels as l (l)}
        {#if found.some((u) => u.level === l)}
          <h3 class="sec-head level-head" data-level={l}>{lvName(l)}</h3>
          {@render unitList(found.filter((u) => u.level === l))}
        {/if}
      {/each}
      {#if !found.length}<p class="talk-nothing">{t('talk.nothing')}</p>{/if}
    {:else if level}
      {@render unitList(shownUnits.filter((u) => u.level === level), 'tabpanel')}
    {/if}
    <p class="guide-line">{t('talk.guide.write')} <a class="guide" href={`${GUIDE}/GUIDE.${ui.lang === 'pt' ? 'pt-BR' : ui.lang}.md`} target="_blank" rel="noopener">{t('talk.guide.link')}</a></p>
  {:else}
    <div class="unit-page">
      <button class="back" onclick={back}>← {t('talk.back')}</button>
      <h3>{slot(unit.id)} · {nar(unit.title)}</h3>
      <p class="situation">{nar(unit.situation)}</p>
      {#if allTags(unit).length}<p class="learn-tags"><span class="kanji-label">{t('talk.lessons')}</span>
        {@render tagList(allTags(unit), 'learn-tag')}</p>{/if}
      {#if unit.kanji?.length}{@render kanjiList(unit.kanji, 'unit-kanji', 'talk.kanji.new')}{/if}
      {#if needVoices}
        <div class="voice-gate">
          <p>{t('talk.voices.need', { names: missing.map((v) => v.natural.name).join(', '), mb: missing.reduce((n, v) => n + (v.natural.sizeMB ?? 0), 0) })}</p>
          <button class="get-voices primary" disabled={fetching !== null} onclick={getVoices}>⬇ {t('talk.voices.get')}</button>
          {#if fetching !== null}<progress max="100" value={fetching}></progress>{/if}
          <button class="robot-anyway" onclick={() => (gateClosed = true)}>{t('talk.voices.robot')}</button>
        </div>
      {/if}
      {@render gearPanel()}
      <details class="howto"><summary>{t('talk.howto.title')}</summary><div class="prose">{@html t('talk.howto.html')}</div></details>
      <ol class="steps">
        {#each unit.steps as s, n}
          <li class="step" class:current={current === n} class:sounding={playing === n} data-type={s.type}>
            {#if s.type !== 'selfcheck'}<span class="num">{n + 1}</span>{/if}
            {#if s.type !== 'selfcheck'}<button class="play" class:playing={playing === n && !paused} class:paused={playing === n && paused}
              aria-label={playing === n && !paused ? t('talk.pause') : t('talk.play')} title={playing === n && !paused ? t('talk.pause') : t('talk.play')}
              onclick={() => play(s, n)}>{@render icon(playing === n && !paused ? 'pause' : 'play')}</button>{/if}
            {#if s.type === 'narrator'}
              <span class="narration">{shownNarration(nar(s.text))}</span>
            {:else if s.type === 'dialogue'}
              <span class="kind">{s.again ? t('talk.dialogue.again') : t('talk.dialogue')}</span>
              <button class="reveal" aria-expanded={!!shown[n]} onclick={() => toggle(n)}>{shown[n] ? t('talk.hide') : t('talk.show')}</button>
              {#if shown[n]}
                <ul class="lines">{#each linesOf(s) as ln, li}<li><b class="who">{speaker(ln.speaker)}:</b> {@render words(`${n}.${li}`, ln.text)} <span class="meaning">{nar(ln.meaning)}</span>
                  {#if trainerHref}<a class="trainer" href={trainerHref(ln.text)} title={t('talk.trainer')}>🎤</a>{/if}</li>{/each}</ul>
              {/if}
            {:else if s.type === 'line'}
              <b class="who">{speaker(s.speaker)}</b> {@render taught(n, items[s.item]?.text ?? '', nar(items[s.item]?.meaning))}
            {:else if s.type === 'buildup'}
              <span class="kind">{t('talk.buildup')}</span>
              <button class="reveal" aria-expanded={!!shown[n]} onclick={() => toggle(n)}>{shown[n] ? t('talk.hide') : t('talk.show')}</button>
              {#if shown[n]}{@render words(n, s.parts.at(-1))}{/if}
              {#if Practice}<button class="practise" aria-expanded={practising === n} onclick={() => practise(n)}>🎤 {t('talk.practise')}</button>{/if}
              {#if Practice && practising === n}<div class="practice"><Practice text={s.parts.at(-1)} ph={compareOf(s.parts.at(-1))} {...practiceProps} /></div>{/if}
            {:else if s.type === 'prompt'}
              <span class="ask">{shownNarration(nar(s.ask))}</span>{#if s.review} <span class="review-tag">{t('talk.review')}</span>{/if}
              {#if s.review && n === firstReview && unit.review_kanji?.length}{@render kanjiList(unit.review_kanji, 'review-kanji', 'talk.kanji.review')}{/if}
              <span class="pause-hint">{t('talk.sayIt')}</span>
              <button class="answer" onclick={() => answer(s, n)}>{t('talk.answer')}</button>
              {#if Practice}<button class="practise" aria-expanded={practising === n} onclick={() => practise(n)}>🎤 {t('talk.practise')}</button>{/if}
              {#if shown[n]}{@render words(n, s.answer.text)}{/if}
              {#if Practice && practising === n}<div class="practice"><Practice text={s.answer.text} ph={compareOf(s.answer.text)} {...practiceProps} /></div>{/if}
            {:else if s.type === 'selfcheck'}
              <strong class="selfcheck-q">{t('talk.selfcheck')}</strong>
              <button class="done-yes" onclick={() => markDone(true)}>{t('talk.selfcheck.yes')}</button>
              <button class="done-no" onclick={() => markDone(false)}>{t('talk.selfcheck.no')}</button>
            {/if}
          </li>
        {/each}
      </ol>
      <div class="player-bar" role="toolbar" aria-label={t('talk.player')}>
        <button class="hands-free" class:on={handsFree} aria-pressed={handsFree} onclick={toggleHandsFree}>🎧 {handsFree ? t('talk.handsFree.stop') : t('talk.handsFree.start')}</button>
        <div class="transport">
          <button class="prev" aria-label={t('talk.prev')} title={t('talk.prev')} onclick={prev}>{@render icon('prev')}</button>
          <button class="playpause" aria-label={playing !== null && !paused ? t('talk.pause') : t('talk.play')} onclick={playPause}>{@render icon(playing !== null && !paused ? 'pause' : 'play')}</button>
          <button class="next" aria-label={t('talk.next')} title={t('talk.next')} onclick={next}>{@render icon('next')}</button>
        </div>
        <span class="where">{current == null ? t('talk.steps', { total: unit.steps.length }) : t('talk.where', { n: current + 1, total: unit.steps.length })}</span>
      </div>
    </div>
  {/if}
</section>

<style>
  .level-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0 8px; }
  .level-tab { padding: 8px 12px; border: 0; background: transparent; color: var(--ink); cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; gap: 12px; }
  .level-tab.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 18%, var(--panel)); }
  .level-count { font-weight: 400; opacity: 0.75; font-size: 0.85em; }
  .step.sounding { outline: 2px solid var(--accent, #6a4c93); outline-offset: 2px; }   /* the step whose audio is playing */
  .step.current { background: color-mix(in srgb, var(--accent, #6a4c93) 14%, transparent); border-radius: 8px; }
  .play.playing, .play.paused { outline: 2px solid var(--accent, #6a4c93); }
  .voice-gate { border: 1px solid var(--accent, #6a4c93); border-radius: 8px; padding: 8px 12px; margin: 8px 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .voice-gate p { flex-basis: 100%; margin: 0; }
  .howto { margin: 8px 0; }
  .practice { flex-basis: 100%; margin-top: 6px; }
  .unit-page { padding-bottom: 120px; }
  .player-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px;
    padding: 8px 16px calc(8px + env(safe-area-inset-bottom)); background: var(--panel); color: var(--ink); border-top: 2px solid var(--accent); box-shadow: 0 -2px 10px rgb(0 0 0 / 0.15); }
  .player-bar button { color: var(--ink); background: var(--panel-hi, var(--panel)); border: 1px solid var(--line); }
  .ic { width: 60%; height: 60%; display: block; }
  .play { display: inline-flex; align-items: center; justify-content: center; width: var(--control-h); height: var(--control-h); padding: 0; border-radius: 50%; }
  .play .ic { width: 70%; height: 70%; }
  .transport { display: flex; gap: 14px; align-items: center; }
  .transport button { font-size: 1.6rem; width: 52px; height: 52px; border-radius: 50%; padding: 0; line-height: 1; display: inline-flex; align-items: center; justify-content: center; }
  .transport .playpause { font-size: 2rem; width: 64px; height: 64px; }
  .hands-free { font-size: 1.05rem; font-weight: 700; padding: 10px 16px; border-radius: 24px; border: 2px solid var(--accent, #6a4c93); }
  .player-bar .hands-free.on { background: var(--fill); color: var(--fill-ink); }
  .where { flex-basis: 100%; text-align: center; font-size: 0.9rem; color: var(--muted); }   /* own line: the controls stay centred */
  button.w { background: none; border: 0; padding: 0 1px; font: inherit; color: inherit; cursor: pointer; border-bottom: 1px dotted currentColor; }
  button.w:hover { background: color-mix(in srgb, var(--accent, #6a4c93) 15%, transparent); }
  .roman { display: block; font-size: 0.85em; opacity: 0.75; font-style: italic; }
  .entry { flex-basis: 100%; margin-top: 6px; max-width: 100%; overflow-x: auto; }
  .num { display: inline-block; min-width: 1.8em; text-align: right; opacity: 0.6; font-variant-numeric: tabular-nums; margin-right: 4px; }
  .units { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
  .unit-row { width: 100%; text-align: start; padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--card, transparent); color: var(--ink); cursor: pointer; }
  .unit-row:hover { border-color: var(--accent); }
  .unit-row.done { border-color: var(--accent); }
  .u-id { font-variant-numeric: tabular-nums; color: var(--ink-2); }
  .tick { color: var(--accent-text); font-weight: 700; }
  .u-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .u-tag, .learn-tag { font-size: 0.78rem; border: 1px solid var(--line); border-radius: 999px; padding: 0 8px; color: var(--ink-2); text-decoration: none; }
  a.learn-tag:hover { border-color: var(--accent); color: var(--accent-text); }
  .learn-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .talk-search { width: 100%; box-sizing: border-box; padding: 6px 10px; margin: 0 0 8px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); font: inherit; }
  .level-head { margin: 12px 0 4px; font-size: 1rem; }
  .only-in { padding: 24px 0; font-size: 1.1rem; }
  .only-in ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; }
  .only-in a { display: inline-block; padding: 8px 14px; border: 1px solid var(--accent); border-radius: 8px; text-decoration: none; }
  .in-dev { border: 1px solid var(--accent); border-radius: 8px; padding: 8px 12px; background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .talk-example, .narrator-fallback { color: var(--ink-2); font-size: 0.92rem; }
  .steps { padding-inline-start: 1.6em; display: grid; gap: 8px; }
  .step { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
  /* every step is a box (Allan, 2026-10-27); the playing one keeps its outline and the last clicked its tint */
  .step:not([data-type="selfcheck"]) { border: 1px solid var(--line); border-radius: 8px; padding: 6px 10px; }
  /* the text stays beside ▶ and wraps inside itself, also on review prompts with long asks */
  .narration, .ask { flex: 1 1 14em; min-width: 0; }
  .step[data-type="selfcheck"] { list-style: none; margin-top: 10px; }
  .selfcheck-q { display: block; width: 100%; font-size: 1.2rem; }
  /* the page ends above the fixed player bar, so the activity log under it can be read */
  :global(body:has(.player-bar)) { padding-bottom: 80px; }
  .u-tag, .learn-tag { background: color-mix(in srgb, var(--lvc, var(--ink-2)) 14%, var(--panel)); border-color: color-mix(in srgb, var(--lvc, var(--line)) 60%, transparent) !important; color: var(--ink) !important; }
  a.u-tag, a.learn-tag { cursor: pointer; }
  a.u-tag:hover, a.learn-tag:hover { background: color-mix(in srgb, var(--lvc, var(--ink-2)) 30%, var(--panel)); }
  .reviewed { border-style: dashed !important; }
  /* one hue per level, far apart on the colour wheel, readable in light and dark */
  [data-lv="0"] { --lvc: #2e9e44; } [data-lv="1"] { --lvc: #1f6fd1; } [data-lv="2"] { --lvc: #8e44ad; }
  [data-lv="3"] { --lvc: #e67e22; } [data-lv="4"] { --lvc: #d63031; } [data-lv="5"] { --lvc: #00a3a3; }
  .unit-item .u-tags { margin: 2px 0 6px 8px; }
  .play { border-radius: 999px; width: 2.2em; height: 2.2em; border: 1px solid var(--accent); background: transparent; color: var(--accent-text); cursor: pointer; }
  .reveal, .answer, .check, .back, .done-yes, .done-no { border: 1px solid var(--line); border-radius: 999px; padding: 2px 12px; background: transparent; color: var(--ink); cursor: pointer; }
  .taught { font-weight: 600; font-size: 1.08rem; }
  .taught rt { font-size: 0.6em; font-weight: 400; color: var(--ink-2); }
  .taught ruby { ruby-align: center; }
  .meaning { color: var(--ink-2); font-style: italic; }
  .kind, .pause-hint { color: var(--ink-2); font-size: 0.9rem; }
  .unit-kanji, .review-kanji { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .kanji-label { font-size: 0.85rem; color: var(--ink-2); flex-basis: 100%; }
  .kanji { font-size: 1.3rem; border: 1px solid var(--line); border-radius: 8px; padding: 0 8px; text-decoration: none; color: inherit; }
  a.kanji:hover { border-color: currentColor; }
  .review-tag { font-size: 0.78rem; border: 1px solid var(--line); border-radius: 999px; padding: 0 8px; color: var(--ink-2); }
  .lines { list-style: none; padding: 0; margin: 4px 0 0; width: 100%; display: grid; gap: 2px; }
  .typed { min-width: 12em; padding: 3px 8px; border: 1px solid var(--line); border-radius: 6px; background: transparent; color: var(--ink); }
  .verdict[data-ok="true"] { color: var(--ok, green); font-weight: 700; }
  .verdict[data-ok="false"] { color: var(--err, #b00); font-weight: 700; }
  .trainer { text-decoration: none; }
  .not-yet { border-left: 4px solid var(--warn, #c77700); background: var(--warn-bg, color-mix(in srgb, #c77700 12%, transparent)); padding: 0.6em 0.8em; border-radius: 6px; }
</style>
