<script>
  import { createLexicon } from '../lib/lexicon.js';
  import { makeFetchShard, fileFetcherFor, loadManifest, loadLemmas, loadIpa, loadGlosses } from './lib/fetchers.js';
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
  import { createVoice, pausePlayback, resumePlayback, stopPlayback } from './lib/voice.js';
  import { t, ui, setLang, uiDir } from './lib/i18n.svelte.js';
  import { createActivity } from './lib/activity.svelte.js';
  import ActivityLog from './components/ActivityLog.svelte';
  import Drills from './components/Drills.svelte';
  import Downloads from './components/Downloads.svelte';
  import SendToCasus from './components/SendToCasus.svelte';
  import Proofread from './components/Proofread.svelte';
  import Learn from './components/Learn.svelte';
  import Trainer from './components/Trainer.svelte';
  import Talk from './components/Talk.svelte';
  import VoiceSettings from './components/VoiceSettings.svelte';
  import WordEntry from './components/WordEntry.svelte';
  import { learnPath, speakPath } from './lib/route.js';
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
  // Conversation courses still being revised show an in-development banner (Allan, 2026-10-27; docs/conversation/TASKS-2026-10-27.md)
  const TALK_IN_DEVELOPMENT = ['de', 'ja', 'mk'];
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
  // the Conversation narrator speaks the interface language, with that language's own voice tiers
  const narrators = new Map();
  function narratorVoice(code) {
    if (typeof window === 'undefined') return null;
    if (!narrators.has(code)) {
      const l = getLanguage(code);
      narrators.set(code, createVoice({ bcp47: l.bcp47, espeakVoice: l.voice?.espeak, natural: l.voice?.natural ?? null }));
    }
    return narrators.get(code);
  }
  const activity = createActivity({ slowText: () => t('activity.slow') });
  const fetchImpl = activity.wrap(rawFetch);
  const say = (key, vars, kind) => activity.say(t(key, vars), kind);

  let status = $state({ key: 'app.status.loading' });
  let lexicon = $state(null);
  // the dictionary data a word's entry shows (Learn pages; Allan, 2026-10-20), loaded on the first click
  let entryInfo = null;
  const loadEntryInfo = () => (entryInfo ??= Promise.all([
    loadLemmas(fetchImpl, DATA).catch(() => ({})), loadIpa(fetchImpl, DATA).catch(() => ({})),
    loadGlosses(fetchImpl, DATA, ui.lang === 'pt' ? 'pt' : 'en').then((g) => g ?? loadGlosses(fetchImpl, DATA, 'en')).catch(() => null),
  ]).then(([lemmas, ipa, glosses]) => ({ lemmas, ipa, glosses })));
  const loadParadigmOf = (id) => fetchImpl(`${DATA}/paradigms/${Number(id) % 512}.json`).then((r) => (r.ok ? r.json() : {})).then((b) => b[String(id)] ?? null).catch(() => null);
  let samples = $state([]);
  let reader = $state(null);
  let autosave = null;
  let hovered = $state(null);
  let open = $state(null);          // the block whose dictionary is open
  let help = $state(false);
  const UI_NAMES = { en: 'English', pt: 'Português', de: 'Deutsch', mk: 'Македонски', ar: 'العربية' };
  let settingsBox;                  // the gear's panel (Allan, 2026-10-22)
  $effect(() => {
    const away = (e) => { if (settingsBox?.open && !settingsBox.contains(e.target)) settingsBox.open = false; };
    document.addEventListener('click', away);
    return () => document.removeEventListener('click', away);
  });
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
  <!-- the header on a phone (Allan, 2026-10-22: the whole first screen was flags): line one the three sites, the XP chip and a
       gear holding everything else; line two the current language and the views -->
  <header class="top">
    <div class="titlebar">
      <h1 class="visually-hidden">{SITE.title} · {lang.name?.[ui.lang] ?? lang.name?.en ?? ''}</h1>
      <LanguageBar current={lang.code} view={route.view} parts={['sites']} />
      <LanguageBar current={lang.code} view={route.view} parts={['viewfold']} />
      <div class="corner">
        <ProgressChip {progression} version={xpVersion} {toasts} />
        <details class="settings" bind:this={settingsBox}>
          <!-- the gear says what you learn and in which language: target → interface (Allan, 2026-10-22) -->
          <summary class="gear" aria-label={t('settings.open')}>
            <span class="lang-pair" title={`${lang.name?.[ui.lang] ?? lang.name?.en ?? ''} → ${UI_NAMES[ui.lang] ?? ui.lang}`}>{#if languageFlag(lang.code)}<img class="flag" src={languageFlag(lang.code)} alt="" />{:else}{lang.code.toUpperCase()}{/if} → {ui.lang.toUpperCase()}</span>
            <span class="cog" aria-hidden="true">⚙</span>
          </summary>
          <div class="settings-panel">
            <p class="pair-line">{#if languageFlag(lang.code)}<img class="flag" src={languageFlag(lang.code)} alt="" />{/if}<b>{lang.name?.[ui.lang] ?? lang.name?.en ?? ''}</b> → <b>{UI_NAMES[ui.lang] ?? ui.lang}</b></p>
            <p class="tagline">{t('app.tagline', { language: lang.inText?.[ui.lang] ?? lang.name?.[ui.lang] ?? lang.inText?.en ?? lang.name?.en })}</p>
            <div class="learn-target"><span class="lbl">{t('nav.learnTarget')}</span>
              <LanguageBar current={lang.code} view={route.view} parts={['languages']} />
            </div>
            <div class="lang-arrow" aria-hidden="true">↓</div>
            <div class="learn-in"><span class="lbl">{t('nav.learningIn')}</span>
              <div class="langs" role="group" aria-label="language" title={t('app.lang.title')}>
                <button class="ui-lang" class:active={ui.lang === 'en'} data-lang="en" onclick={() => switchLang('en')}>English</button>
                <button class="ui-lang" class:active={ui.lang === 'pt'} data-lang="pt" onclick={() => switchLang('pt')}>Português</button>
                <button class="ui-lang" class:active={ui.lang === 'de'} data-lang="de" onclick={() => switchLang('de')}>Deutsch</button>
                <button class="ui-lang" class:active={ui.lang === 'mk'} data-lang="mk" lang="mk" onclick={() => switchLang('mk')}>Македонски</button>
                <button class="ui-lang" class:active={ui.lang === 'ar'} data-lang="ar" lang="ar" onclick={() => switchLang('ar')}>العربية</button>
              </div>
            </div>
            {#if route.view === 'reader'}<div class="exports" aria-label="export">
              <span class="exports-label">{t('app.export')}</span>
              <button class="export-json" disabled={!reader} title={t('app.export.json.title')} onclick={() => download('json')}>{t('app.export.json')}</button>
              <button class="export-md" disabled={!reader} title={t('app.export.md.title')} onclick={() => download('md')}>{t('app.export.md')}</button>
            </div>{/if}
            <ThemeControls code={lang.code} {storage} />
            <div class="settings-row">
              <a class="report-button" target="_blank" rel="noopener" title={t('app.report.title')}
                href={issueUrl({ href: typeof location !== 'undefined' ? location.href : '', site: SITE.title, language: lang.name?.en ?? lang.code, view: route.view, ui: ui.lang })}>⚑ {t('app.report')}</a>
              <button class="help-button" title={t('app.help.title')} aria-label="help" onclick={() => { help = true; settingsBox.open = false; }}>?</button>
            </div>
          </div>
        </details>
      </div>
    </div>
    <div class="viewbar">
      <LanguageBar current={lang.code} view={route.view} parts={['views']} />
    </div>
  </header>

  {#if route.view === 'speak'}
    <Trainer {lang} {voice} {fetchImpl} data={DATA} base={withBase('/')} {lexicon} {storage} {award}
      loadParadigm={(id) => fetchImpl(`${DATA}/paradigms/${Number(id) % 512}.json`).then((r) => (r.ok ? r.json() : {})).then((b) => b[String(id)] ?? null).catch(() => null)} say={(msg, kind) => activity.say(msg, kind)} />
  {:else if route.view === 'talk'}
    <Talk {lang} {storage} loadTalk={() => fetchImpl(withBase(`/talk/${lang.code}.json`)).then((r) => (r.ok ? r.json() : null))}
      speakTaught={async (text, opts) => { if (!voice) throw new Error('no voice'); return voice.speak(text, opts); }}
      speakNarrator={async (text, code) => narratorVoice(code)?.speak(text)}
      trainerHref={(text) => speakHref(withBase(speakPath(LANGUAGES.find((l) => l.code === lang.code) ?? { path: '/' })), text)}
      Entry={WordEntry} entryProps={{ lookup: (w) => (lexicon ? lexicon.lookup(w) : Promise.resolve([])), loadInfo: loadEntryInfo, loadParadigm: loadParadigmOf, voice }}
      VoiceBox={VoiceSettings}
      Practice={Trainer} practiceProps={{ lang, voice, fetchImpl, data: DATA, base: withBase('/'), lexicon, storage, compact: true, say: (msg, kind) => activity.say(msg, kind) }}
      control={{ pause: pausePlayback, resume: resumePlayback, stop: stopPlayback }} voices={[voice]} narratorVoiceOf={narratorVoice}
      kanjiHref={(lesson) => `${withBase(learnPath(LANGUAGES.find((l) => l.code === lang.code) ?? { path: '/' }))}#${lesson}`}
      lessonHref={(lesson) => `${withBase(learnPath(LANGUAGES.find((l) => l.code === lang.code) ?? { path: '/' }))}#${lesson}`}
      loadLearn={() => fetchImpl(`${DATA}/learn.json`).then((r) => (r.ok ? r.json() : null))}
      inDevelopment={TALK_IN_DEVELOPMENT.includes(lang.code)}
      say={(msg, kind) => activity.say(msg, kind)} />
  {:else if route.view === 'learn'}
    <Learn {lang} {storage} {award} {progression} startLesson={decodeURIComponent(location.hash.slice(1)) || null} lookup={(w) => (lexicon ? lexicon.lookup(w) : Promise.resolve([]))} loadInfo={loadEntryInfo} loadParadigm={loadParadigmOf} speak={(text) => speakHref(withBase(speakPath(LANGUAGES.find((l) => l.code === lang.code) ?? { path: '/' })), text)} loadLearn={() => fetchImpl(`${DATA}/learn.json`).then((r) => (r.ok ? r.json() : null))}
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
    <Help view={route.view} onclose={() => (help = false)} />
  {/if}

  <ActivityLog {activity} />

  <footer>
    <span>{@html t('footer', { source: lang.sources?.full?.[ui.lang] ?? lang.sources?.full?.en ?? '' })}</span>
  </footer>
</main>

<style>
  .live-toggle { display: block; margin-top: 10px; }
  main { width: min(1500px, 100% - 2 * var(--gutter)); margin: 0 auto; padding: clamp(10px, 2vw, 24px) 0 40px; display: flex; flex-direction: column; gap: clamp(12px, 1.8vw, 22px); }
  .top { display: flex; flex-direction: column; gap: 8px; }
  .titlebar { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .titlebar :global(nav.sites) { margin: 0; }
  .corner { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; margin-inline-start: auto; }
  .titlebar { flex-wrap: nowrap; }
  .pair-line { margin: 0; display: flex; align-items: center; gap: 6px; font-size: 0.95rem; }
  .pair-line .flag { width: 22px; height: 16px; border-radius: 2px; box-shadow: 0 0 0 1px rgba(0,0,0,.15); }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .viewbar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .settings { position: relative; }
  .gear { list-style: none; cursor: pointer; height: var(--control-h); box-sizing: border-box; padding: 0 10px; display: inline-flex; align-items: center; gap: 8px; border: 1.5px solid var(--line); border-radius: 21px; background: var(--panel); color: var(--ink); font-weight: 700; font-size: 0.85rem; }
  .gear .cog { font-size: 1.35rem; }
  .lang-pair { display: inline-flex; align-items: center; gap: 4px; }
  .lang-pair .flag { width: 20px; height: 14px; border-radius: 2px; box-shadow: 0 0 0 1px rgba(0,0,0,.15); }
  .gear::-webkit-details-marker { display: none; }
  .settings[open] .gear { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, var(--panel)); }
  .settings-panel { position: absolute; z-index: 60; top: calc(100% + 6px); inset-inline-end: 0; width: min(92vw, 560px); max-height: 80vh; overflow: auto; display: flex; flex-direction: column; gap: 12px;
    padding: 14px; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.22); }
  .lbl { display: block; font-weight: 700; font-size: 0.85rem; color: var(--ink-2); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }
  .lang-arrow { text-align: center; font-size: 1.4rem; color: var(--accent-text, var(--accent)); line-height: 1; margin: -4px 0; }
  .settings-row { display: flex; gap: 10px; align-items: center; justify-content: space-between; }
  .tagline { margin: 0; color: var(--ink-2); font-size: 0.9rem; }
  .exports { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .langs { display: inline-flex; flex-wrap: wrap; max-width: 100%; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
  .langs .ui-lang { border: 0; border-radius: 0; min-height: var(--control-h); padding: 0 10px; }
  .langs .ui-lang.active { background: var(--accent); color: var(--accent-ink); }
  .exports-label { color: var(--ink-2); font-size: 0.85rem; margin-right: 2px; }
  .report-button { display: inline-flex; align-items: center; gap: 4px; padding: 0 10px; height: var(--control-h); box-sizing: border-box; border: 1.5px solid var(--line); border-radius: 8px; color: var(--ink); text-decoration: none; font-size: .9em; background: var(--panel); }
  .report-button:hover { border-color: var(--accent); }
  .help-button { width: var(--control-h); height: var(--control-h); border-radius: 50%; font-weight: 700; font-size: 1.1rem; padding: 0; background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
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
  @media (max-width: 560px) {
    .settings-panel { position: fixed; top: 64px; inset-inline: 12px; width: auto; }
    .corner :global(.xp-chip .bar), .corner :global(.xp-chip .streak) { display: none; }
    .viewbar { display: none; }
    .gear .lang-pair { display: none; }
    .gear { padding: 0; width: var(--control-h); justify-content: center; border-radius: 50%; }
    .titlebar { gap: 6px; }
  }
</style>
