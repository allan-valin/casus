<script>
  import { createLexicon } from '../lib/lexicon.js';
  import { makeFetchShard, loadManifest } from './lib/fetchers.js';
  import { withBase } from './lib/paths.js';
  import { createReader } from './stores/reader.svelte.js';
  import { textHash, createAutosave, restore } from './lib/persist.js';
  import { toJSON, toMarkdown } from './lib/exporters.js';
  import TextPane from './components/TextPane.svelte';
  import BlockPane from './components/BlockPane.svelte';
  import Dictionary from './components/Dictionary.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import LayerToggles from './components/LayerToggles.svelte';
  import Legend from './components/Legend.svelte';
  import Help from './components/Help.svelte';
  import PassagePicker from './components/PassagePicker.svelte';
  import { t, ui, setLang } from './lib/i18n.svelte.js';
  import { createActivity } from './lib/activity.svelte.js';
  import ActivityLog from './components/ActivityLog.svelte';
  import { describeAnalysis, blockStyle } from './lib/colors.js';

  const DATA = withBase('/data');

  // injected for tests; the browser gets the real ones
  function defaultStorage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
  }
  let {
    fetchImpl: rawFetch = (...a) => window.fetch(...a),
    storage = defaultStorage(),
    schedule = (fn, ms) => setTimeout(fn, ms),
    cancel = (t) => clearTimeout(t),
  } = $props();
  const activity = createActivity({ slowText: () => t('activity.slow') });
  const fetchImpl = activity.wrap(rawFetch);
  const say = (key, vars, kind) => activity.say(t(key, vars), kind);

  let status = $state({ key: 'app.status.loading' });
  let lexicon = $state(null);
  let samples = $state([]);
  let reader = $state(null);
  let autosave = null;
  let hovered = $state(null);
  let open = $state(null);          // the block whose dictionary is open
  let help = $state(false);
  let legendOpen = $state(typeof window === 'undefined' || window.innerWidth > 700);   // folded on a phone, open on a monitor
  let generation = 0;               // choose() calls; a slower, older load must not win

  $effect(() => {
    loadManifest(fetchImpl, DATA)
      .then((manifest) => {
        lexicon = createLexicon({ fetchShard: makeFetchShard(fetchImpl, DATA), manifest });
        status = { key: 'app.status.ready', vars: { entries: manifest.lemmas?.toLocaleString?.() ?? '', shards: Object.keys(manifest.shards).length, built: manifest.built } };
        say('act.ready', status.vars, 'ok');
      })
      .catch((e) => { status = { key: 'app.status.none', vars: { error: e.message } }; say('act.noLexicon', { error: e.message }, 'err'); });
    fetchImpl(withBase('/samples/index.json')).then((r) => (r.ok ? r.json() : [])).then((list) => { samples = list; }).catch(() => {});
  });

  async function choose(text, era) {
    if (!lexicon) return;
    const mine = ++generation;
    autosave?.flush();                // the passage being left keeps its last change
    const key = `casus:${textHash(text)}`;
    const save = createAutosave({ storage: storage ?? { getItem: () => null, setItem: () => {} }, key, schedule, cancel });
    const saved = restore(save.loaded(), text);
    const r = createReader({ lexicon, text, saved, onaction: logAction });
    if (!saved && era) r.era = era;
    if (!saved) r.glossLang = ui.lang;   // the page language carries the dictionary language with it
    const t0 = Date.now();
    say('act.reading', { words: text.split(/\s+/).filter(Boolean).length, sentences: r.sentences.length });
    await r.load();
    if (mine !== generation) return;  // a newer choose() won while this one loaded
    autosave = save;
    reader = r;
    open = null;
    const blocks = r.blocks;
    say('act.read', { words: r.sentences.reduce((n, s, i) => n + r.blocksOf(i).length, 0), sentences: r.sentences.length,
      ambiguous: blocks.filter((b) => blockStyle(b, r.layers).ambiguous).length, unknown: blocks.filter((b) => b.candidates.length === 0).length, ms: Date.now() - t0 }, 'ok');
    if (saved) say('act.restored');
    r.loadExtras(fetchImpl, DATA).then(() => say('act.extras', { pt: r.lexiconExtras.glosses.pt ? t('act.extras.pt') : '' })).catch(() => {});
  }

  function logAction(kind, info = {}) {
    const r = reader;
    const word = (i) => r?.blocks.find((b) => b.token.index === i)?.token.surface ?? `#${i + 1}`;
    switch (kind) {
      case 'select': { const blocks = r?.blocks ?? []; say('act.selected', { n: info.n, words: blocks.length, ambiguous: blocks.filter((b) => blockStyle(b, r.layers).ambiguous).length }); break; }
      case 'pin': say('act.pinned', { word: word(info.tokenIndex), reading: describeAnalysis(info.analysis) }, 'ok'); break;
      case 'unpin': say('act.unpinned', { word: word(info.tokenIndex) }); break;
      case 'move': say('act.moved', { word: info.indices.map(word).join(' ') }); break;
      case 'restore': say('act.restore'); break;
      case 'autosort': say('act.autosort'); break;
      case 'arrange': say('act.arranged', { pattern: info.pattern }); break;
      case 'glue': say('act.glue', { word: word(info.tokenIndex) }); break;
      default: break;
    }
  }

  // the same block clicked again closes its dictionary (feedback D15)
  function switchLang(lang) {
    setLang(lang);
    if (reader) reader.glossLang = lang;
    say('act.lang', { lang: lang === 'pt' ? 'português (Brasil)' : 'English' });
  }

  function toggleOpen(b) {
    open = open && open.token.index === b.token.index ? null : b;
  }

  // every change is written, debounced; the guard is only armed while a write is pending (§9)
  $effect(() => {
    if (!reader || !autosave) return;
    autosave.save(reader.toJSON());
  });
  // the dictionary belongs to one sentence; selecting another closes it
  $effect(() => {
    void reader?.selected;
    open = null;
  });
  // on the way out, write what is pending; the guard then only covers a storage that refused
  $effect(() => {
    if (typeof window === 'undefined') return;
    const flush = () => autosave?.flush();
    const guard = (e) => { flush(); if (autosave?.pending()) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', guard);
    return () => { window.removeEventListener('pagehide', flush); window.removeEventListener('beforeunload', guard); };
  });

  function download(kind) {
    const text = kind === 'json' ? toJSON(reader) : toMarkdown(reader);
    const blob = new Blob([text], { type: kind === 'json' ? 'application/json' : 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `casus-${textHash(reader.text)}.${kind === 'json' ? 'json' : 'md'}`;
    a.click();
    URL.revokeObjectURL(a.href);
    say('act.export', { kind: kind === 'json' ? 'JSON' : 'Markdown', name: a.download }, 'ok');
  }

  const lemmaOf = (id) => reader?.lexiconExtras.lemmas?.[String(id)] ?? null;
  const openBlock = $derived(open && reader ? (reader.blocks.find((b) => b.token.index === open.token.index) ?? open) : null);
</script>

<main>
  {#if activity.busy}<div class="busy" role="progressbar" aria-label="loading"></div>{/if}
  <header class="top">
    <div class="brand">
      <h1>Casus</h1>
      <p class="tagline">{t('app.tagline')}</p>
    </div>
    <div class="corner">
      <div class="langs" role="group" aria-label="language" title={t('app.lang.title')}>
        <button class="ui-lang" class:active={ui.lang === 'en'} data-lang="en" onclick={() => switchLang('en')}>English</button>
        <button class="ui-lang" class:active={ui.lang === 'pt'} data-lang="pt" onclick={() => switchLang('pt')}>Português</button>
      </div>
      <div class="exports" aria-label="export">
        <span class="exports-label">{t('app.export')}</span>
        <button class="export-json" disabled={!reader} title={t('app.export.json.title')} onclick={() => download('json')}>{t('app.export.json')}</button>
        <button class="export-md" disabled={!reader} title={t('app.export.md.title')} onclick={() => download('md')}>{t('app.export.md')}</button>
      </div>
      <button class="help-button" title={t('app.help.title')} aria-label="help" onclick={() => (help = true)}>?</button>
    </div>
  </header>

  <section class="card">
    <h2><span class="step">1</span> {t('text.heading')}</h2>
    <PassagePicker {samples} onchoose={choose} {fetchImpl} />
    <p class="status" aria-live="polite">{t(status.key, status.vars)}</p>
  </section>

  {#if reader}
    <section class="card">
      <h2><span class="step">2</span> {t('sentences.heading')} <span class="hint-inline">{t('sentences.hint')}</span></h2>
      <TextPane {reader} {hovered} />
    </section>

    <section class="card blocks">
      <h2><span class="step">3</span> {t('blocks.heading', { n: reader.selected + 1 })}</h2>
      <p class="hint">{@html t('blocks.hint')}</p>
      <div class="block-controls">
        <LayerToggles {reader} />
      </div>
      <BlockPane {reader} onhover={(i) => (hovered = i)} onopen={toggleOpen} {lemmaOf} />
      <details class="legend-box" bind:open={legendOpen}>
        <summary>{t('legend.summary')}</summary>
        <Legend />
      </details>
    </section>

    <section class="card">
      <h2><span class="step">4</span> {t('settings.heading')}</h2>
      <Toolbar {reader} />
    </section>

    {#if openBlock}
      <Dictionary block={openBlock} {reader} onclose={() => (open = null)} />
    {/if}
  {/if}

  {#if help}
    <Help onclose={() => (help = false)} />
  {/if}

  <ActivityLog {activity} />

  <footer>
    <span>{@html t('footer')}</span>
  </footer>
</main>

<style>
  main { width: min(1500px, 100% - 2 * var(--gutter)); margin: 0 auto; padding: clamp(10px, 2vw, 24px) 0 40px; display: flex; flex-direction: column; gap: clamp(12px, 1.8vw, 22px); }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
  h1 { margin: 0; font-family: Georgia, serif; font-size: clamp(1.7rem, 1.4rem + 1.2vw, 2.4rem); letter-spacing: 0.01em; }
  .tagline { margin: 4px 0 0; color: var(--ink-2); max-width: 60ch; }
  .corner { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .exports { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .langs { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
  .langs .ui-lang { border: 0; border-radius: 0; min-height: 34px; padding: 4px 10px; }
  .langs .ui-lang.active { background: var(--accent); color: var(--accent-ink); }
  .exports-label { color: var(--ink-2); font-size: 0.85rem; margin-right: 2px; }
  .help-button { width: 40px; height: 40px; border-radius: 50%; font-weight: 700; font-size: 1.1rem; padding: 0; background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: clamp(12px, 1.6vw, 22px) clamp(12px, 2vw, 26px); box-shadow: 0 1px 2px rgba(0,0,0,.04); }
  h2 { margin: 0 0 12px; font-size: clamp(1.05rem, 1rem + 0.3vw, 1.3rem); display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .step { display: inline-flex; width: 1.6em; height: 1.6em; align-items: center; justify-content: center; border-radius: 50%; background: var(--accent); color: var(--accent-ink); font-size: 0.8em; font-weight: 700; align-self: center; }
  .hint-inline { font-size: 0.8em; font-weight: 400; color: var(--muted); }
  .hint { margin: -4px 0 12px; color: var(--ink-2); font-size: 0.92rem; line-height: 1.5; }
  .status { color: var(--muted); font-size: 0.82rem; margin: 10px 0 0; }
  .block-controls { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
  .legend-box { margin-top: 14px; }
  .legend-box summary { cursor: pointer; color: var(--ink-2); font-weight: 600; font-size: 0.92rem; padding: 4px 0; }
  .legend-box :global(.legend) { margin-top: 8px; }
  .busy { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 70; background: linear-gradient(90deg, transparent, var(--accent), transparent); background-size: 40% 100%; animation: slide 1.1s linear infinite; }
  @keyframes slide { from { background-position: -40% 0; } to { background-position: 140% 0; } }
  footer { color: var(--muted); font-size: 0.8rem; text-align: center; padding-top: 8px; }
  @media (max-width: 640px) {
    .top { flex-direction: column; }
    .corner { width: 100%; justify-content: space-between; }
  }
</style>
