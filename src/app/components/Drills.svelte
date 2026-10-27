<script>
  /* The drills page (Allan, 2026-10-18; was the letters drill): pick a language here and its drills open —
   * the letters of a non-Latin alphabet, and the noun and verb endings of every language. */
  import { onMount } from 'svelte';
  import { t, ui } from '../lib/i18n.svelte.js';
  import Game from './Game.svelte';
  import EndingsDrill from './EndingsDrill.svelte';
  import ChoiceDrill from './ChoiceDrill.svelte';
  import TypeDrill from './TypeDrill.svelte';
  import ListenDrill from './ListenDrill.svelte';
  import SpotDrill from './SpotDrill.svelte';
  import MatchDrill from './MatchDrill.svelte';
  import PairsDrill from './PairsDrill.svelte';
  import ShadowDrill from './ShadowDrill.svelte';
  import { clozeItems, whoItems, spotItems, binItems, soundItems, pairItems, agreementItems, learnSample } from '../lib/moredrills.js';
  import { sentencePool } from '../lib/listen.js';
  import Overlay from './Overlay.svelte';
  import Picker from './Picker.svelte';
  import CheatSheet from './CheatSheet.svelte';
  import { parseItems, transformItems } from '../lib/parse.js';
  import { createReview } from '../lib/review.js';
  let { lang, voice = null, loadData, loadParadigm = null, navigate, random = Math.random, storage = null, award = null } = $props();

  const NOMINAL = new Set(['noun', 'adj', 'det', 'pron']);
  // a language that does not inflect (Chinese) has no endings drills; one without noun cases (Portuguese) only the verbs
  // (the newer drills, research items 4–15: each only where its data exists — genders, IPA, a voice, noun cases)
  const cased = $derived(!!lang.inventory?.channels?.case);
  const drills = $derived([...(lang.game ? ['letters'] : []), ...(lang.noEndings ? [] : lang.noNounEndings ? ['verbs', 'parse', 'transform'] : ['nouns', 'verbs', 'parse', 'transform', ...(models.length && !agreeList.length ? [] : ['agree'])]),
    'cloze', 'spot', ...(cased ? ['who'] : []), 'words', 'match', ...(bins?.items?.length ? ['bins'] : []), ...(sounds?.words?.length ? ['sounds'] : []),
    ...(sounds?.pairs?.length && voice ? ['pairs'] : []), 'phrases', 'listen', ...(voice ? ['shadow'] : []), 'review']);
  let chosen = $state(null);
  const drill = $derived(chosen && drills.includes(chosen) ? chosen : drills[0]);
  let models = $state([]);
  let cheat = $state(false);
  let frequency = $state([]);
  let phrases = $state([]);
  let bins = $state(null);
  let sounds = $state(null);
  const load = (name, set) => loadData(name).then((x) => set(x ?? [])).catch(() => set([]));
  onMount(() => {
    load('drills', (x) => { models = x; }); load('frequency', (x) => { frequency = x; }); load('phrases', (x) => { phrases = x; });
    load('bins', (x) => { bins = Array.isArray(x) ? null : x; }); load('sounds', (x) => { sounds = Array.isArray(x) ? null : x; });
  });
  // the drills on real sentences read a sample of the Learn lessons, once, when first opened
  const LEARN_BASED = new Set(['cloze', 'spot', 'who', 'shadow']);
  let sample = $state(null);
  let sampling = false;
  $effect(() => {
    if (!LEARN_BASED.has(drill) || sample || sampling) return;
    sampling = true;
    learnSample(loadData, random).then((x) => { sample = x; }).catch(() => { sample = { lessons: [], qs: [] }; });
  });
  let soundDir = $state('word');
  // frequent words: a rank range and a direction
  const RANGES = [[1, 200], [201, 500], [501, 1000]];
  let range = $state('1-200');
  let direction = $state('meaning');
  // a list with levels (Japanese: JLPT N5, N4) is drilled by level, others by rank range
  const levels = $derived([...new Set(frequency.map((f) => f.level).filter(Boolean))]);
  const ranges = $derived(levels.length ? levels : RANGES.filter(([a]) => a <= Math.max(1, frequency.length)).map(([a, b]) => `${a}-${Math.min(b, frequency.length || b)}`));
  $effect(() => { if (ranges.length && !ranges.includes(range)) range = ranges[0]; });
  const inRange = $derived.by(() => {
    if (levels.length) return frequency.filter((f) => f.level === range);
    const [a, b] = range.split('-').map(Number);
    return frequency.filter((f) => f.rank >= a && f.rank <= b);
  });
  const romaji = (reading) => (reading && lang.script?.romanize ? lang.script.romanize(reading) : undefined);
  const wordItems = $derived(inRange.map((f) => (direction === 'meaning' ? { prompt: f.w, answer: f.en, roman: romaji(f.reading) } : { prompt: f.en, answer: f.w })));          // no reading here: it would give the answer away
  // phrases: everyday phrases, idioms, proverbs, or all
  let kind = $state('all');
  const phraseItems = $derived(phrases.filter((p) => kind === 'all' || p.kind === kind).map((p) => ({ prompt: p.p, answer: p.en, lit: p.lit, kind: p.kind, literally: p.literally, more: p.more, wiki: p.wiki, note: p.note, roman: romaji(p.reading), hint: p.reading })));
  const nouns = $derived(models.filter((m) => NOMINAL.has(m.pos)));
  const verbs = $derived(models.filter((m) => m.pos === 'verb'));
  // parse the form: every form of the model words, its cell to choose (any reading of a syncretic form is right)
  const caseName = (c) => lang.inventory.channels.case?.name?.[ui.lang]?.[c] ?? lang.inventory.channels.case?.name?.en?.[c] ?? c;
  const paraWord = (x) => (t(`para.${x}`) === `para.${x}` ? x : t(`para.${x}`));
  const cellName = (table, r, c) => `${table.rowsBy === 'case' ? caseName(r) : table.rowsBy === 'jform' ? t(`para.ja.${r}`) : t(`para.p${r}`)} · ${String(c).split(' ').map(paraWord).join(' ')}`;
  // (placeholder values — x — are left out of the name)
  const clean = (name) => name.split(' · ').map((x) => x.split(' ').filter((w) => w && w !== 'x').join(' ')).filter(Boolean).join(' · ');
  const parseList = $derived(models.flatMap((m) => parseItems(m, lang, (tb, r, c, several) => clean((several && tb.label ? `${tb.label.split(' · ').map(paraWord).join(' ')} · ` : '') + cellName(tb, r, c)))
    .map((it) => ({ ...it, hint: `${m.dict_form ?? m.headword}${m.gloss ? ` — ${typeof m.gloss === 'string' ? m.gloss : (m.gloss[ui.lang] ?? m.gloss.en)}` : ''}` }))));
  // transformation: a form and one change (plural, another case or person): type the new form
  const changeName = (v) => (/^[123]$/.test(v) ? t(`para.p${v}`) : caseName(v) !== v ? caseName(v) : String(v).split(' ').map(paraWord).join(' '));
  const transformList = $derived(models.flatMap((m) => transformItems(m, lang, changeName)
    .map((it) => ({ ...it, prompt: `${it.prompt}   (${m.dict_form ?? m.headword})` }))));
  // spaced review: every answer here and in Learn is scheduled; the Review tab asks what is due
  const review = createReview(lang.code, storage);
  const remember = (item, correct) => { review.record(item, correct); award?.({ correct, kind: `drill:${drill}` }); };
  let dueItems = $state([]);
  $effect(() => { if (drill === 'review') dueItems = review.due(); });
  const genderNames = $derived(Object.fromEntries(['m', 'f', 'n', 'c'].map((g) => [g, paraWord(g)])));
  const agreeList = $derived(agreementItems(models, lang, caseName, paraWord));
  const drillName = (d) => lang.drillNames?.[d]?.[ui.lang] ?? t(`drills.${d}`);
</script>

<section class="card drills">
  <h2>{t('drills.heading')}</h2>
  <div class="bar">
    <!-- no language dropdown: the language nav already chooses it; the drill types under one button (Allan, 2026-10-22) -->
    <Picker cls="drill-picker" label={drillName(drill)} title={t('drills.pick')}>
      {#each drills as d}
        <button class="drill-tab" class:active={d === drill} data-drill={d} aria-current={d === drill ? 'true' : undefined} onclick={() => { chosen = d; }}>{drillName(d)}</button>
      {/each}
    </Picker>
    <button class="cheatsheet" onclick={() => { cheat = true; }}>{t('drills.cheatsheet')}</button>
  </div>
  <p class="hint">{t(`drills.${drill}.hint`)}</p>
  {#if cheat}
    <Overlay onclose={() => { cheat = false; }} label={t('drills.cheatsheet')} wide>
      <CheatSheet {lang} {drill} {drills} {nouns} {verbs} words={inRange} phrases={phrases.filter((p) => kind === 'all' || p.kind === kind)} />
    </Overlay>
  {/if}
  {#if drill === 'letters'}
    <Game {lang} {voice} />
  {:else if drill === 'words'}
    <div class="options">
      <label>{t('words.range')}
        <select class="word-range" bind:value={range}>{#each ranges as r}<option value={r}>{r.replace('-', '–')}</option>{/each}</select>
      </label>
      <label>{t('words.direction')}
        <select class="word-direction" bind:value={direction}><option value="meaning">{t('words.toMeaning')}</option><option value="word">{t('words.toWord')}</option><option value="typed">{t('words.toTyped')}</option></select>
      </label>
    </div>
    {#key `${range}|${direction}|${frequency.length}`}
      {#if direction === 'typed'}<TypeDrill items={inRange.map((f) => ({ prompt: f.en, answer: f.w }))} {lang} {random} onresult={remember} />
      {:else}<ChoiceDrill items={wordItems} {random} romanize={lang.script?.romanize ?? null} onresult={remember} />{/if}
    {/key}
  {:else if drill === 'phrases'}
    <div class="options">
      <label>{t('phrases.kind')}
        <select class="phrase-kind" bind:value={kind}>
          {#each ['all', 'phrase', 'idiom', 'proverb'] as k}<option value={k}>{t(`phrases.${k}`)} ({k === 'all' ? phrases.length : phrases.filter((p) => p.kind === k).length})</option>{/each}
        </select>
      </label>
    </div>
    {#key `${kind}|${phrases.length}`}<ChoiceDrill items={phraseItems} {random} romanize={lang.script?.romanize ?? null} onresult={remember} />{/key}
  {:else if drill === 'match'}
    {#key `match|${frequency.length}`}<MatchDrill items={frequency.map((f) => ({ w: f.w, en: f.en }))} {random} {lang} onresult={remember} />{/key}
  {:else if drill === 'bins'}
    {#key `bins|${ui.lang}`}<ChoiceDrill items={binItems(bins, genderNames)} {random} onresult={remember} />{/key}
  {:else if drill === 'sounds'}
    <div class="options">
      <select class="sound-direction" bind:value={soundDir}><option value="word">{t('sounds.toWord')}</option><option value="ipa">{t('sounds.toIpa')}</option></select>
    </div>
    {#key `sounds|${soundDir}`}<ChoiceDrill items={soundItems(sounds, soundDir)} {random} onresult={remember} />{/key}
  {:else if drill === 'pairs'}
    {#key 'pairs'}<PairsDrill items={pairItems(sounds, random)} {voice} {random} onresult={remember} />{/key}
  {:else if drill === 'agree'}
    {#key `agree|${models.length}|${ui.lang}`}<ChoiceDrill items={agreeList} {random} onresult={remember} />{/key}
  {:else if LEARN_BASED.has(drill)}
    {#if !sample}<p class="muted">{t('more.loading')}</p>
    {:else if drill === 'cloze'}
      {#key `cloze|${ui.lang}`}{#if clozeItems(sample.qs, ui.lang).length}<TypeDrill items={clozeItems(sample.qs, ui.lang)} {lang} {random} onresult={remember} />{:else}<p class="muted">{t('more.none')}</p>{/if}{/key}
    {:else if drill === 'spot'}
      {#key 'spot'}{#if spotItems(sample.qs, random).length}<SpotDrill items={spotItems(sample.qs, random)} {lang} {random} onresult={remember} />{:else}<p class="muted">{t('more.none')}</p>{/if}{/key}
    {:else if drill === 'who'}
      {#key `who|${ui.lang}`}{#if whoItems(sample.qs, ui.lang).length}<ChoiceDrill items={whoItems(sample.qs, ui.lang)} {random} onresult={remember} ordered />{:else}<p class="muted">{t('more.none')}</p>{/if}{/key}
    {:else}
      {#key 'shadow'}<ShadowDrill sentences={sentencePool(sample.lessons)} {voice} {lang} {random} />{/key}
    {/if}
  {:else if drill === 'listen'}
    {#key 'listen'}<ListenDrill {lang} {voice} {loadData} {random} onresult={remember} />{/key}
  {:else if drill === 'review'}
    {#if dueItems.length}<p class="review-count">{t('review.due', { n: dueItems.length, total: review.size() })}</p>
      {#key dueItems.length}<ChoiceDrill items={dueItems} {random} romanize={lang.script?.romanize ?? null} onresult={remember} ordered />{/key}
    {:else}<p class="review-empty">{t('review.none', { total: review.size() })}</p>{/if}
  {:else if drill === 'transform'}
    {#key `transform|${models.length}|${ui.lang}`}<TypeDrill items={transformList} {lang} {random} onresult={remember} />{/key}
  {:else if drill === 'parse'}
    {#key `parse|${models.length}|${ui.lang}`}<ChoiceDrill items={parseList} {random} romanize={lang.script?.romanize ?? null} onresult={remember} />{/key}
  {:else if drill === 'nouns'}
    {#key 'nouns'}<EndingsDrill {lang} models={nouns} {random} {loadParadigm} />{/key}
  {:else}
    {#key 'verbs'}<EndingsDrill {lang} models={verbs} {random} {loadParadigm} />{/key}
  {/if}
</section>

<style>
  .bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 8px; }
  label { display: inline-flex; gap: 6px; align-items: center; font-weight: 600; }
  select { font: inherit; padding: 6px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); }
  .cheatsheet { font: inherit; height: var(--control-h); box-sizing: border-box; padding: 0 14px; border: 1.5px solid var(--accent); border-radius: 8px; background: var(--panel); color: var(--ink); cursor: pointer; font-weight: 600; }
  .drill-tab { font: inherit; padding: 8px 12px; border: 0; background: transparent; color: var(--ink); cursor: pointer; }
  .drill-tab:hover { background: color-mix(in srgb, var(--accent) 10%, var(--panel)); }
  .drill-tab.active { background: var(--fill); color: var(--fill-ink); }
  .hint, .muted { color: var(--ink-2); }
  .options { display: flex; flex-wrap: wrap; gap: 12px; margin: 6px 0; }
  .options select { max-width: 100%; }
</style>
