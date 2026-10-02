<script>
  import { createLexicon } from '../lib/lexicon.js';
  import { makeFetchShard, loadManifest } from './lib/fetchers.js';
  import { createReader } from './stores/reader.svelte.js';
  import { textHash, createAutosave, restore } from './lib/persist.js';
  import TextPane from './components/TextPane.svelte';
  import BlockPane from './components/BlockPane.svelte';
  import Dictionary from './components/Dictionary.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import PassagePicker from './components/PassagePicker.svelte';

  // injected for tests; the browser gets the real ones
  let {
    fetchImpl = (...a) => window.fetch(...a),
    storage = typeof localStorage !== 'undefined' ? localStorage : null,
    schedule = (fn, ms) => setTimeout(fn, ms),
    cancel = (t) => clearTimeout(t),
  } = $props();

  let status = $state('loading the lexicon…');
  let lexicon = $state(null);
  let samples = $state([]);
  let reader = $state(null);
  let autosave = null;
  let hovered = $state(null);
  let open = $state(null);          // the block whose dictionary is open

  $effect(() => {
    loadManifest(fetchImpl)
      .then((manifest) => {
        lexicon = createLexicon({ fetchShard: makeFetchShard(fetchImpl), manifest });
        status = `lexicon ready: ${Object.keys(manifest.shards).length} shards, built ${manifest.built}`;
      })
      .catch((e) => { status = `no lexicon: ${e.message} — run python3 tools/build_index.py`; });
    fetchImpl('/samples/index.json').then((r) => (r.ok ? r.json() : [])).then((list) => { samples = list; }).catch(() => {});
  });

  async function choose(text, era) {
    if (!lexicon) return;
    const key = `casus:${textHash(text)}`;
    autosave = createAutosave({ storage: storage ?? { getItem: () => null, setItem: () => {} }, key, schedule, cancel });
    const saved = restore(autosave.loaded(), text);
    const r = createReader({ lexicon, text, saved });
    if (!saved && era) r.era = era;
    await r.load();
    reader = r;
    open = null;
    r.loadExtras(fetchImpl).catch(() => {});
  }

  // every change is written, debounced; the guard is only armed while a write is pending (§9)
  $effect(() => {
    if (!reader || !autosave) return;
    autosave.save(reader.toJSON());
  });
  $effect(() => {
    if (typeof window === 'undefined') return;
    const guard = (e) => { if (autosave?.pending()) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  });

  function download(kind, text) {
    const blob = new Blob([text], { type: kind === 'json' ? 'application/json' : 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `casus-${textHash(reader.text)}.${kind === 'json' ? 'json' : 'md'}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const lemmaOf = (id) => reader?.lexiconExtras.lemmas?.[String(id)] ?? null;
  const openBlock = $derived(open && reader ? (reader.blocks.find((b) => b.token.index === open.token.index) ?? open) : null);
</script>

<main>
  <header>
    <h1>Casus</h1>
    <p class="status">{status}</p>
    <PassagePicker {samples} onchoose={choose} {fetchImpl} />
  </header>

  {#if reader}
    <Toolbar {reader} onexport={download} />
    <div class="panes">
      <section class="left"><TextPane {reader} {hovered} /></section>
      <section class="right">
        <BlockPane {reader} onhover={(i) => (hovered = i)} onopen={(b) => (open = b)} {lemmaOf} />
        {#if openBlock}
          <Dictionary block={openBlock} {reader} onclose={() => (open = null)} />
        {/if}
      </section>
    </div>
  {/if}
</main>

<style>
  main { font-family: system-ui, sans-serif; max-width: 1280px; margin: 0 auto; padding: 16px; }
  h1 { margin: 0 0 4px; font-family: Georgia, serif; }
  .status { color: #666; font-size: 0.85em; margin: 0 0 8px; }
  .panes { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12px; }
  .left { border-right: 1px solid #ddd; padding-right: 16px; }
</style>
