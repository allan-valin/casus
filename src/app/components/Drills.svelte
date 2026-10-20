<script>
  /* The drills page (Allan, 2026-10-18; was the letters drill): pick a language here and its drills open —
   * the letters of a non-Latin alphabet, and the noun and verb endings of every language. */
  import { onMount } from 'svelte';
  import { siteLanguages } from '../../sites.js';
  import { t, ui } from '../lib/i18n.svelte.js';
  import { drillsPath } from '../lib/route.js';
  import Game from './Game.svelte';
  import EndingsDrill from './EndingsDrill.svelte';
  import ChoiceDrill from './ChoiceDrill.svelte';
  import TypeDrill from './TypeDrill.svelte';
  import Overlay from './Overlay.svelte';
  import CheatSheet from './CheatSheet.svelte';
  import { parseItems, transformItems } from '../lib/parse.js';
  import { createReview } from '../lib/review.js';
  let { lang, voice = null, loadData, loadParadigm = null, navigate, random = Math.random, storage = null } = $props();

  const NOMINAL = new Set(['noun', 'adj', 'det', 'pron']);
  // a language that does not inflect (Chinese) has no endings drills; one without noun cases (Portuguese) only the verbs
  const drills = $derived([...(lang.game ? ['letters'] : []), ...(lang.noEndings ? [] : lang.noNounEndings ? ['verbs', 'parse', 'transform'] : ['nouns', 'verbs', 'parse', 'transform']), 'words', 'phrases', 'review']);
  let chosen = $state(null);
  const drill = $derived(chosen && drills.includes(chosen) ? chosen : drills[0]);
  let models = $state([]);
  let cheat = $state(false);
  let frequency = $state([]);
  let phrases = $state([]);
  const load = (name, set) => loadData(name).then((x) => set(x ?? [])).catch(() => set([]));
  onMount(() => { load('drills', (x) => { models = x; }); load('frequency', (x) => { frequency = x; }); load('phrases', (x) => { phrases = x; }); });
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
  const caseName = (c) => lang.inventory.channels.case?.name?.[ui.lang]?.[c] ?? c;
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
  const remember = (item, correct) => review.record(item, correct);
  let dueItems = $state([]);
  $effect(() => { if (drill === 'review') dueItems = review.due(); });
  const withDrills = siteLanguages();     // this site's languages; every one has at least the endings drills
</script>

<section class="card drills">
  <h2>{t('drills.heading')}</h2>
  <div class="bar">
    <label>{t('drills.language')}
      <select class="drill-language" value={lang.code} onchange={(e) => navigate(drillsPath(withDrills.find((l) => l.code === e.currentTarget.value)))}>
        {#each withDrills as l}<option value={l.code}>{l.name[ui.lang] ?? l.name.en}</option>{/each}
      </select>
    </label>
    <button class="cheatsheet" onclick={() => { cheat = true; }}>{t('drills.cheatsheet')}</button>
    <div class="tabs" role="tablist">
      {#each drills as d}
        <button class="drill-tab" class:active={d === drill} data-drill={d} role="tab" aria-selected={d === drill} onclick={() => { chosen = d; }}>{lang.drillNames?.[d]?.[ui.lang] ?? t(`drills.${d}`)}</button>
      {/each}
    </div>
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
  .cheatsheet { font: inherit; padding: 6px 14px; border: 1.5px solid var(--accent); border-radius: 8px; background: var(--panel); color: var(--ink); cursor: pointer; font-weight: 600; }
  .tabs { display: flex; flex-wrap: wrap; gap: 4px; }
  .drill-tab { font: inherit; padding: 6px 14px; border: 1.5px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--ink); cursor: pointer; }
  .drill-tab.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .hint { color: var(--ink-2); }
  .options { display: flex; flex-wrap: wrap; gap: 12px; margin: 6px 0; }
  .options select { max-width: 100%; }
</style>
