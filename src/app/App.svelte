<script>
  import { createLexicon } from '../lib/lexicon.js';
  import { makeFetchShard, fileFetcherFor, loadManifest } from './lib/fetchers.js';
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
  import LanguageBar from './components/LanguageBar.svelte';
  import { getLanguage, LANGUAGES } from '../lang/registry.js';
  import { langFromPath } from './lib/route.js';
  import { createVoice } from './lib/voice.js';
  import { t, ui, setLang, uiDir } from './lib/i18n.svelte.js';
  import { createActivity } from './lib/activity.svelte.js';
  import ActivityLog from './components/ActivityLog.svelte';
  import Drills from './components/Drills.svelte';
  import Downloads from './components/Downloads.svelte';
  import SendToCasus from './components/SendToCasus.svelte';
  import Proofread from './components/Proofread.svelte';
  import Learn from './components/Learn.svelte';
  import Trainer from './components/Trainer.svelte';
  import { speakPath } from './lib/route.js';
  import { speakHref } from './lib/pronounce.js';
  import ThemeControls from './components/ThemeControls.svelte';
  import ProgressChip from './components/ProgressChip.svelte';
  import { createProgression } from './lib/progression.js';
  import { issueUrl } from './lib/report.js';
  import { languageFlag } from './lib/theme.js';
  import { SITE } from '../sites.js';
  import { describeAnalysis } from './lib/colors.js';
  import { partners as partnersOf } from './lib/chunks.js';
  import { createLive } from '../lib/live.js';

  const route = langFromPath(typeof location !== 'undefined' ? location.pathname : '/', import.meta.env?.BASE_URL ?? '/');
  const lang = getLanguage(route.code);
  const DATA = withBase(lang.dataPath);
  const voice = typeof window === 'undefined' ? null : createVoice({ bcp47: lang.bcp47, espeakVoice: lang.voice.espeak, natural: lang.voice.natural ?? null });

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
  let legendOpen = $state(false);   // closed by default to save space (Allan, 2026-10-18)
  let generation = 0;               // choose() calls; a slower, older load must not win
  // Wiktionary on demand for words the dictionary lacks (Allan, 2026-10-19); on unless switched off, kept per browser
  let liveOn = $state((() => { try { return storage?.getItem('casus.live') !== 'off'; } catch { return true; } })());
  function setLive(on) { liveOn = on; try { storage?.setItem('casus.live', on ? 'on' : 'off'); } catch { /* not kept */ } say(on ? 'act.live.on' : 'act.live.off'); }
  const liveStore = { get: (k) => { try { const v = storage?.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
    set: (k, v) => { try { storage?.setItem(k, JSON.stringify(v)); } catch { /* full */ } } };
  function liveFor() {
    if (!liveOn || (typeof navigator !== 'undefined' && navigator.onLine === false)) return null;
    const primary = lang.inventory.channels[lang.inventory.primary];
    const l = createLive({ fetchImpl: rawFetch, code: lang.code, caseIds: primary?.values ?? [], storage: liveStore });
    return { lookup: async (words) => { say('act.live.asking', { n: words.length }); const out = await l.lookup(words); say('act.live.found', { n: [...out.values()].filter((r) => r.analyses.length || r.alternativeOf).length, of: words.length }, 'ok'); return out; } };
  }

  $effect(() => {
    loadManifest(fetchImpl, DATA)
      .then((manifest) => {
        lexicon = createLexicon({ fetchShard: makeFetchShard(fetchImpl, DATA), fetchFile: fileFetcherFor(manifest, fetchImpl, DATA), manifest, codes: lang.inventory.codes, script: lang.script });
        status = { key: 'app.status.ready', vars: { entries: manifest.lemmas?.toLocaleString?.() ?? '', shards: Object.keys(manifest.shards).length, built: manifest.built } };
        say('act.ready', status.vars, 'ok');
      })
      .catch((e) => { status = { key: 'app.status.none', vars: { error: e.message } }; say('act.noLexicon', { error: e.message }, 'err'); });
    fetchImpl(withBase(`${lang.samplesPath}/index.json`)).then((r) => (r.ok ? r.json() : [])).then((list) => { samples = list; }).catch(() => {});
  });

  async function choose(text, era) {
    if (!lexicon) return;
    const mine = ++generation;
    autosave?.flush();                // the passage being left keeps its last change
    const store = storage ?? { getItem: () => null, setItem: () => {} };
    const key = `casus:${lang.code}:${textHash(text)}`;
    // arrangements saved before languages existed sit under casus:<hash>; Latin reads them once
    if (lang.code === 'la' && store.getItem(key) === null && store.getItem(`casus:${textHash(text)}`) !== null) store.setItem(key, store.getItem(`casus:${textHash(text)}`));
    const save = createAutosave({ storage: store, key, schedule, cancel });
    const saved = restore(save.loaded(), text);
    const r = createReader({ lexicon, text, saved, onaction: logAction, lang, live: liveFor() });
    if (!saved && era) r.era = era;
    if (!saved) r.glossLang = ui.lang === 'pt' ? 'pt' : 'en';   // (German page: English glosses)   // the page language carries the dictionary language with it
    const t0 = Date.now();
    say('act.reading', { words: text.split(/\s+/).filter(Boolean).length, sentences: r.sentences.length });
    await r.load();
    if (mine !== generation) return;  // a newer choose() won while this one loaded
    autosave = save;
    reader = r;
    open = null;
    const blocks = r.blocks;
    say('act.read', { words: r.sentences.reduce((n, s, i) => n + r.blocksOf(i).length, 0), sentences: r.sentences.length,
      ambiguous: blocks.filter((b) => r.colors.blockStyle(b, r.layers).ambiguous).length, unknown: blocks.filter((b) => b.candidates.length === 0).length, ms: Date.now() - t0 }, 'ok');
    if (saved) say('act.restored');
    r.loadExtras(fetchImpl, DATA).then(() => say('act.extras', { pt: r.lexiconExtras.glosses.pt ? t('act.extras.pt') : '' })).catch(() => {});
  }

  function logAction(kind, info = {}) {
    const r = reader;
    const word = (i) => r?.blocks.find((b) => b.token.index === i)?.token.surface ?? `#${i + 1}`;
    switch (kind) {
      case 'select': { const blocks = r?.blocks ?? []; say('act.selected', { n: info.n, words: blocks.length, ambiguous: blocks.filter((b) => r.colors.blockStyle(b, r.layers).ambiguous).length }); break; }
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
    say('act.lang', { lang: { pt: 'português (Brasil)', de: 'Deutsch', mk: 'македонски', ar: 'العربية' }[lang] ?? 'English' });
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

  // the hovered word's agreement partners, for the text pane (the pool computes its own)
  const hotPartners = $derived(hovered === null || !reader ? new Set() : new Set(partnersOf(reader.blocks).get(hovered) ?? []));
  const lemmaOf = (id) => reader?.lexiconExtras.lemmas?.[String(id)] ?? null;
  const openBlock = $derived(open && reader ? (reader.blocks.find((b) => b.token.index === open.token.index) ?? open) : null);
  // XP, levels, streak and achievements (Allan, 2026-10-20, after Duolingo): every answer in Learn and the drills
  const progression = createProgression(storage);
  let xpVersion = $state(0);
  let toasts = $state([]);
  let toastId = 0;
  function toast(text) {
    const id = (toastId += 1);
    toasts = [...toasts, { id, text }];
    setTimeout(() => { toasts = toasts.filter((x) => x.id !== id); }, 3500);
  }
  function award(x) {
    const r = progression.award({ ...x, lang: lang.code });
    xpVersion += 1;
    if (r.levelUp) toast(`⭐ ${t('xp.levelUp', { n: r.levelUp })}`);
    for (const id of r.unlocked) toast(`🏆 ${t('xp.unlocked', { name: t(`ach.${id}`) })}`);
  }
  // the interface language on the page: Arabic turns the chrome right to left (texts keep their own direction)
  $effect(() => { try { document.documentElement.lang = ui.lang; document.documentElement.dir = uiDir(ui.lang); } catch { /* no document */ } });
</script>

<main style:--font-scale={lang.script?.fontScale ?? 1}>
  {#if activity.busy}<div class="busy" role="progressbar" aria-label="loading"></div>{/if}
  <header class="top">
    <div class="brand">
      <h1>{SITE.title} <span class="lang-name">· {#if languageFlag(lang.code)}<img class="flag" src={languageFlag(lang.code)} alt="" />{/if}{lang.name?.[ui.lang] ?? lang.name?.en ?? ''}</span></h1>
      <LanguageBar current={lang.code} view={route.view} />
      <p class="tagline">{t('app.tagline', { language: lang.inText?.[ui.lang] ?? lang.name?.[ui.lang] ?? lang.inText?.en ?? lang.name?.en })}</p>
    </div>
    <div class="corner">
      <div class="langs" role="group" aria-label="language" title={t('app.lang.title')}>
        <button class="ui-lang" class:active={ui.lang === 'en'} data-lang="en" onclick={() => switchLang('en')}>English</button>
        <button class="ui-lang" class:active={ui.lang === 'pt'} data-lang="pt" onclick={() => switchLang('pt')}>Português</button>
        <button class="ui-lang" class:active={ui.lang === 'de'} data-lang="de" onclick={() => switchLang('de')}>Deutsch</button>
        <button class="ui-lang" class:active={ui.lang === 'mk'} data-lang="mk" lang="mk" onclick={() => switchLang('mk')}>Македонски</button>
        <button class="ui-lang" class:active={ui.lang === 'ar'} data-lang="ar" lang="ar" onclick={() => switchLang('ar')}>العربية</button>
      </div>
      {#if route.view === 'reader'}<div class="exports" aria-label="export">
        <span class="exports-label">{t('app.export')}</span>
        <button class="export-json" disabled={!reader} title={t('app.export.json.title')} onclick={() => download('json')}>{t('app.export.json')}</button>
        <button class="export-md" disabled={!reader} title={t('app.export.md.title')} onclick={() => download('md')}>{t('app.export.md')}</button>
      </div>{/if}
      <ProgressChip {progression} version={xpVersion} {toasts} />
      <ThemeControls code={lang.code} {storage} />
      <a class="report-button" target="_blank" rel="noopener" title={t('app.report.title')}
        href={issueUrl({ href: typeof location !== 'undefined' ? location.href : '', site: SITE.title, language: lang.name?.en ?? lang.code, view: route.view, ui: ui.lang })}>⚑ {t('app.report')}</a>
      <button class="help-button" title={t('app.help.title')} aria-label="help" onclick={() => (help = true)}>?</button>
    </div>
  </header>

  {#if route.view === 'speak'}
    <Trainer {lang} {voice} {fetchImpl} data={DATA} base={withBase('/')} {lexicon} {storage} {award} say={(msg, kind) => activity.say(msg, kind)} />
  {:else if route.view === 'learn'}
    <Learn {lang} {storage} {award} {progression} speak={(text) => speakHref(withBase(speakPath(LANGUAGES.find((l) => l.code === lang.code) ?? { path: '/' })), text)} loadLearn={() => fetchImpl(`${DATA}/learn.json`).then((r) => (r.ok ? r.json() : null))}
      loadLesson={(id) => fetchImpl(`${DATA}/learn/${id}.json`).then((r) => r.json())}
      loadQuestions={(id) => fetchImpl(`${DATA}/learn/q-${id}.json`).then((r) => (r.ok ? r.json() : { qs: [] }))}
      openInReader={(text) => { try { storage?.setItem(`casus:input:${lang.code}`, text); } catch { /* not kept */ } location.href = withBase(LANGUAGES.find((l) => l.code === lang.code)?.path ?? '/'); }} />
  {:else if route.view === 'proof'}
    <Proofread {lang} {storage} {fetchImpl} knownWords={async (words) => {
        if (!lexicon) return new Set();
        const keys = words.map((w) => lang.tokenize(w).find((tk) => tk.kind === 'word')?.key ?? w);
        const found = await lexicon.lookupAll(keys);
        return new Set(words.filter((w, k) => (found.get(keys[k]) ?? []).length));
      }} say={(k, v) => say(k, v, k.endsWith('done') ? 'ok' : k.endsWith('Failed') ? 'err' : undefined)}
      toReader={(text) => { try { storage?.setItem(`casus:input:${lang.code}`, text); } catch { /* not kept */ } location.href = withBase(LANGUAGES.find((l) => l.code === lang.code)?.path ?? '/'); }} />
  {:else if route.view === 'drills'}
    <Drills {lang} {voice} {storage} {award} loadData={(name) => fetchImpl(`${DATA}/${name}.json`).then((r) => (r.ok ? r.json() : []))}
      loadParadigm={(id) => fetchImpl(`${DATA}/paradigms/${Number(id) % 512}.json`).then((r) => (r.ok ? r.json() : {})).then((b) => b[String(id)] ?? null)} navigate={(p) => { location.href = withBase(p); }} />
  {:else}
  <section class="card">
    <h2><span class="step">1</span> {t('text.heading')}</h2>
    <PassagePicker {samples} onchoose={choose} {fetchImpl} samplesPath={lang.samplesPath} language={lang.inText?.[ui.lang] ?? lang.inText?.en ?? ''} onerror={(error) => say('act.uploadFailed', { error }, 'err')}
      {storage} code={lang.code} onsay={(k, v) => say(k, v, 'ok')} />
    <p class="status" aria-live="polite">{t(status.key, status.vars)}</p>
    <!-- always here, before any text is read (Allan, 2026-10-19: Wiktionary on demand, dictionaries offline) -->
    <label class="live-toggle" title={t('settings.live.title')}><input type="checkbox" checked={liveOn} onchange={(e) => setLive(e.currentTarget.checked)}> {t('settings.live')}</label>
    <Downloads {fetchImpl} {storage} current={lang.code} onsay={(k, v) => say(k, v, k.endsWith('done') ? 'ok' : k.endsWith('failed') ? 'err' : undefined)} />
    <SendToCasus pageUrl={typeof location !== 'undefined' ? location.origin + withBase(LANGUAGES.find((l) => l.code === lang.code)?.path ?? '/') : ''} language={lang.name[ui.lang] ?? lang.name.en} />
  </section>

  {#if reader}
    <section class="card">
      <h2><span class="step">2</span> {t('sentences.heading')} <span class="hint-inline">{t('sentences.hint')}</span></h2>
      <TextPane {reader} {hovered} partners={hotPartners} />
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
        <Legend rows={reader.colors.LEGEND} />
      </details>
    </section>

    <section class="card">
      <h2><span class="step">4</span> {t('settings.heading')}</h2>
      <Toolbar {reader} {voice} onvoice={(what, error) => (what === 'downloaded' ? say('act.voiceDownloaded', {}, 'ok') : what === 'removed' ? say('act.voiceRemoved') : say('voice.natural.failed', { error }, 'err'))} />
    </section>

    {#if openBlock}
      <Dictionary block={openBlock} {reader} onclose={() => (open = null)} {voice} onspoke={(word, tier) => (tier ? say('act.spoke', { word, tier }) : say('act.spokeFailed', { word }, 'err'))} />
    {/if}
  {/if}

  {/if}

  {#if help}
    <Help onclose={() => (help = false)} />
  {/if}

  <ActivityLog {activity} />

  <footer>
    <span>{@html t('footer', { source: lang.sources?.full?.[ui.lang] ?? lang.sources?.full?.en ?? '' })}</span>
  </footer>
</main>

<style>
  .live-toggle { display: block; margin-top: 10px; }
  main { width: min(1500px, 100% - 2 * var(--gutter)); margin: 0 auto; padding: clamp(10px, 2vw, 24px) 0 40px; display: flex; flex-direction: column; gap: clamp(12px, 1.8vw, 22px); }
  /* the brand shrinks and its language pills wrap inside it, so the controls stay top right however many languages
     a site has (Casus has 13: Allan, 2026-10-20) */
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: nowrap; }
  .brand { flex: 1 1 auto; min-width: 0; }
  .corner { flex: 0 1 auto; justify-content: flex-end; max-width: 46%; }
  h1 { margin: 0; font-family: Georgia, serif; font-size: clamp(1.7rem, 1.4rem + 1.2vw, 2.4rem); letter-spacing: 0.01em; }
  .lang-name { font-size: 0.5em; color: var(--muted); font-family: system-ui, sans-serif; font-weight: 400; }
  .lang-name .flag { width: 1.5em; height: 1.1em; border-radius: 2px; margin: 0 6px 0 2px; vertical-align: -0.15em; box-shadow: 0 0 0 1px rgba(0,0,0,.15); }
  .brand :global(nav.languages) { margin: 8px 0 2px; }
  .tagline { margin: 4px 0 0; color: var(--ink-2); max-width: 60ch; }
  .corner { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .exports { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .langs { display: inline-flex; flex-wrap: wrap; max-width: 100%; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
  .langs .ui-lang { border: 0; border-radius: 0; min-height: 34px; padding: 4px 10px; }
  .langs .ui-lang.active { background: var(--accent); color: var(--accent-ink); }
  .exports-label { color: var(--ink-2); font-size: 0.85rem; margin-right: 2px; }
  .report-button { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border: 1.5px solid var(--line); border-radius: 8px; color: var(--ink); text-decoration: none; font-size: .9em; background: var(--panel); }
  .report-button:hover { border-color: var(--accent); }
  .help-button { width: 40px; height: 40px; border-radius: 50%; font-weight: 700; font-size: 1.1rem; padding: 0; background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: clamp(12px, 1.6vw, 22px) clamp(12px, 2vw, 26px); box-shadow: 0 1px 2px rgba(0,0,0,.04); }
  h2 { margin: 0 0 12px; font-size: clamp(1.05rem, 1rem + 0.3vw, 1.3rem); display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .step { display: inline-flex; width: 1.6em; height: 1.6em; align-items: center; justify-content: center; border-radius: 50%; background: var(--accent); color: var(--accent-ink); font-size: 0.8em; font-weight: 700; align-self: center; }
  .hint-inline { font-size: 0.8em; font-weight: 400; color: var(--muted); }
  .hint { margin: -4px 0 12px; color: var(--ink-2); font-size: 0.92rem; line-height: 1.5; }
  .status { color: var(--muted); font-size: 0.82rem; margin: 10px 0 0; }
  .block-controls { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
  .legend-box { margin-top: 14px; }
  .legend-box summary { cursor: pointer; color: var(--ink); font-weight: 600; font-size: 0.92rem; padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); display: inline-block; }
  .legend-box summary:hover { border-color: var(--accent); }
  .legend-box[open] summary { border-color: var(--accent); }
  .legend-box :global(.legend) { margin-top: 8px; }
  .busy { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 70; background: linear-gradient(90deg, transparent, var(--accent), transparent); background-size: 40% 100%; animation: slide 1.1s linear infinite; }
  @keyframes slide { from { background-position: -40% 0; } to { background-position: 140% 0; } }
  footer { color: var(--muted); font-size: 0.8rem; text-align: center; padding-top: 8px; }
  @media (max-width: 640px) {
    .top { flex-direction: column; align-items: stretch; }
    .corner { width: 100%; max-width: none; justify-content: space-between; }
  }
</style>
