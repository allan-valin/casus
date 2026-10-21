<script>
  /* The pronunciation trainer (Allan, 2026-10-20): a sentence (typed, or sent from a lesson in the address) gets its
   * Wiktionary IPA word by word; the learner listens (the page's voice, sample recordings of single sounds), records
   * themself, an open phone recogniser (speech-to-ipa's engine) writes down what it heard, and both are lined up sound
   * by sound. A chart, a guide to reading it and a prompt for an AI assistant are one click away. */
  import { onMount } from 'svelte';
  import { t, ui } from '../lib/i18n.svelte.js';
  import Speaker from './Speaker.svelte';
  import IpaChart from './IpaChart.svelte';
  import { widenSlices, buildIpaIndex, expectedFor, expectedSounds, segments, align, score, aiPrompt, sampleFor, ipaFromWikitext } from '../lib/pronounce.js';
  import { loadLemmas, loadIpa } from '../lib/fetchers.js';
  import { MODELS, load, transcribe, to16kMono, playSamples, wavBytes, isCached, forget } from '../speech/engine.js';
  import WordEntry from './WordEntry.svelte';
  import { loadGlosses } from '../lib/fetchers.js';

  let { lang, voice = null, fetchImpl, data, base = '/', lexicon = null, say = () => {}, storage = null, award = null, loadParadigm = null,
    text: given = null, compact = false } = $props();   // compact: inside a conversation step, on the given sentence (Allan, 2026-10-21)

  const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  let text = $state(given ?? params.get('text') ?? '');
  let expected = $state([]);
  let ready = $state(false);
  let samples = $state({});
  let panel = $state(null);          // 'chart' | 'howto' | 'help'
  let modelId = $state((() => { try { return storage?.getItem('casus.speak.model') ?? 'powsm'; } catch { return 'powsm'; } })());
  const model = $derived(MODELS.find((m) => m.id === modelId) ?? MODELS[0]);
  let cached = $state({});
  let loaded = {};
  let busy = $state('');
  let pct = $state(null);
  let recorder = null, chunks = [], recStart = 0, timer = null;
  let recording = $state(false);
  let recSecs = $state(0);
  let wav = $state(null);
  let heard = $state([]);
  let pairs = $state([]);
  let result = $state(null);
  let index = null, lemmas = null, ipa = null;
  const langName = $derived(lang.inText?.[ui.lang] ?? lang.name?.[ui.lang] ?? lang.name?.en ?? lang.code);
  const preferred = (lang.eras ?? [])[0]?.ipa ?? [];

  onMount(async () => {
    fetchImpl(`${base}ipa-sounds/index.json`).then((r) => (r.ok ? r.json() : {})).then((x) => { samples = x; }).catch(() => {});
    for (const m of MODELS) isCached(m).then((c) => { cached = { ...cached, [m.id]: c }; }).catch(() => {});
    [lemmas, ipa] = await Promise.all([loadLemmas(fetchImpl, data).catch(() => ({})), loadIpa(fetchImpl, data)]);
    index = buildIpaIndex(lemmas, ipa, preferred);
    ready = true;
    if (text) { say(t('speak.act.text')); await transcribeText(); }
  });

  const lookup = async (k) => {
    if (!lexicon) return [];
    const key = lang.tokenize?.(k)?.find((tk) => tk.kind === 'word')?.key ?? k;
    return lexicon.lookup(key);
  };

  let debounce = null;
  function edited() { clearTimeout(debounce); debounce = setTimeout(transcribeText, 500); }
  async function transcribeText() {
    if (!ready) return;
    expected = await expectedFor(text, { index, lookup, lemmas, ipa, preferred, noSpaces: !!lang.script?.noSpaces || ['ja', 'zh'].includes(lang.code) });
    pairs = []; result = null;
    const mine = text;
    askWiktionary().then(() => { if (mine === text && heard.length) compare(); });
    if (heard.length) compare();
    if (expected.length) say(t('speak.act.transcribed', { n: expected.length, exact: expected.filter((w) => w.source === 'exact').length, approx: expected.filter((w) => w.source === 'lemma').length, none: expected.filter((w) => w.source === 'none').length }), 'ok');
  }

  // forms the data has no IPA for (Häuser, ist): the form's own Wiktionary page, asked once and kept
  async function askWiktionary() {
    const todo = expected.filter((w) => w.source !== 'exact' && w.source !== 'wikt');
    if (!todo.length || !lang.wiktionary || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    let found = 0;
    await Promise.all(todo.map(async (w) => {
      const k = `casus.speak.wikt.${lang.code}.${w.word.toLowerCase()}`;
      let got;
      try { got = storage?.getItem(k); } catch { got = null; }
      if (got == null) {
        got = '';
        for (const title of [...new Set([w.word, w.word.toLowerCase()])]) {
          try {
            const r = await fetch(`https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&formatversion=2&origin=*`);
            const j = r.ok ? await r.json() : null;
            got = ipaFromWikitext(j?.parse?.wikitext, lang.wiktionary, lang.code) ?? '';
            if (got) break;
          } catch { /* offline or blocked */ }
        }
        try { storage?.setItem(k, got); } catch { /* full */ }
      }
      if (got) { Object.assign(w, { ipa: got, source: 'wikt' }); found += 1; }
    }));
    expected = [...expected];
    say(t('speak.act.wikt', { n: todo.length, k: found }), found ? 'ok' : undefined);
  }

  const used = $derived(new Set(expected.filter((w) => w.ipa).flatMap((w) => segments(w.ipa))));

  function playSample(sym) {
    const f = sampleFor(sym, samples);
    if (!f) { say(t('speak.act.noSample', { sym })); return; }
    say(t('speak.act.sample', { sym }));
    new Audio(`${base}ipa-sounds/${f}`).play().catch((e) => say(t('speak.act.failed', { error: e.message }), 'err'));
  }

  function chooseModel(id) {
    modelId = id;
    try { storage?.setItem('casus.speak.model', id); } catch { /* not kept */ }
    say(`${t('speak.model')}: ${model.name}`);
  }

  // one load per model, shared by the record button (which starts it early) and the recognition
  function ensureModel() {
    const m = model;
    loaded[m.id] ??= (async () => {
      busy = t('speak.act.loading', { model: m.name }); say(busy);
      let fromCache = false;
      const l = await load(m, (f, hit) => { fromCache = hit; pct = Math.round(f * 100); if (!recording) busy = t('speak.act.download', { model: m.name, pct }); }, base);
      pct = null; cached = { ...cached, [m.id]: true };
      if (!recording) busy = '';
      say(t('speak.act.loaded', { model: m.name, how: fromCache ? t('speak.act.fromCache') : t('speak.act.downloaded') }), 'ok');
      return l;
    })().catch((e) => { delete loaded[m.id]; throw e; });
    return loaded[m.id];
  }

  async function toggleRecording() {
    if (recording) { recorder?.stop(); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { say(t('speak.act.micDenied', { err: e.name ?? e.message }), 'err'); return; }
    ensureModel().catch((e) => { busy = ''; say(t('speak.act.failed', { error: e.message }), 'err'); });   // downloads while you speak
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop());
      clearInterval(timer); recording = false;
      try {
        wav = await to16kMono(await new Blob(chunks).arrayBuffer());
        say(t('speak.act.stopped', { s: (wav.length / 16000).toFixed(1) }));
        await recognise();
      } catch (e) { busy = ''; say(t('speak.act.failed', { error: e.message }), 'err'); }
    };
    recorder.start(); recStart = performance.now(); recording = true; recSecs = 0;
    timer = setInterval(() => { recSecs = (performance.now() - recStart) / 1000; }, 100);
    say(t('speak.act.recording'), 'live');
  }

  async function recognise() {
    const l = await ensureModel();
    busy = t('speak.act.recognising'); say(busy);
    const t0 = performance.now();
    heard = widenSlices(await transcribe(model, l, wav), wav.length / 16000);
    busy = '';
    say(t('speak.act.heard', { n: heard.length, s: ((performance.now() - t0) / 1000).toFixed(1) }), 'ok');
    compare();
  }

  function compare() {
    const exp = expectedSounds(expected);
    if (!exp.some((s) => s !== '*')) { pairs = []; result = null; say(t('speak.act.noCompare')); return; }
    pairs = align(exp, heard.map((h) => h.sym));
    result = score(pairs);
    say(t('speak.act.compared', { n: result ?? 0 }), 'ok');
    award?.({ correct: result != null && result >= 70, kind: 'drill:speak' });
  }

  function playMine() { if (wav) { say(t('speak.rec.play')); playSamples(wav); } }
  function playSlice(h) { if (wav && h.start != null) { say(t('speak.act.slice', { sym: h.sym })); playSamples(wav, h.start, h.end); } }
  function downloadWav() {
    if (!wav) return;
    const url = URL.createObjectURL(new Blob([wavBytes(wav)], { type: 'audio/wav' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `casus-${lang.code}-recording.wav` });
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    say(t('speak.rec.download'));
  }

  const expectedLine = $derived(expected.map((w) => (w.ipa ? `${w.word} ${w.source === 'lemma' ? '≈' : ''}${w.ipa}` : `${w.word} (?)`)).join('\n'));
  const heardLine = $derived(heard.map((h) => h.sym).join(' '));
  const prompt = $derived(aiPrompt({ language: lang.name?.en && ui.lang === 'en' ? lang.name.en : langName, sentence: text, expected: expectedLine, heard: heardLine || '—', ui: ui.lang }));
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(prompt); say(t('speak.act.copied'), 'ok'); } catch (e) { say(t('speak.act.failed', { error: e.message }), 'err'); }
  }
  function toggle(p) { panel = panel === p ? null : p; if (p === 'options' && panel) refreshOptions(); }

  // options, as in speech-to-ipa: the microphone, and each model's size, licence and cache, deletable by hand
  let mic = $state('');
  let usage = $state(null);
  async function refreshOptions() {
    for (const m of MODELS) isCached(m).then((c) => { cached = { ...cached, [m.id]: c }; }).catch(() => {});
    try { mic = (await navigator.permissions.query({ name: 'microphone' })).state; } catch { mic = ''; }
    try { const e = await navigator.storage.estimate(); usage = Math.round(e.usage / 1e6); } catch { usage = null; }
  }
  async function allowMic() {
    try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((tr) => tr.stop()); say(t('speak.opt.micOk'), 'ok'); }
    catch (e) { say(t('speak.act.micDenied', { err: e.name ?? e.message }), 'err'); }
    refreshOptions();
  }
  async function downloadModel(m) {
    const keep = modelId; modelId = m.id;
    try { await ensureModel(); } catch (e) { say(t('speak.act.failed', { error: e.message }), 'err'); }
    modelId = keep; refreshOptions();
  }
  async function deleteModel(m) {
    try { await loaded[m.id]?.then((l) => l.session.release()); } catch { /* not open */ }
    delete loaded[m.id];
    await forget(m);
    say(t('speak.opt.deleted', { model: m.name, mb: m.mb }), 'ok');
    refreshOptions();
  }

  // a dictionary entry for each word, as in the reader
  let openWord = $state(null);
  let glosses = null;
  // the entry panel (WordEntry, shared with Learn) gets the dictionary data this page loads anyway
  const loadInfo = async () => {
    glosses ??= await loadGlosses(fetchImpl, data, ui.lang === 'pt' ? 'pt' : 'en').then((g) => g ?? loadGlosses(fetchImpl, data, 'en')).catch(() => null);
    return { lemmas, ipa, glosses };
  };
  function toggleEntry(w) {
    openWord = openWord === w.word ? null : w.word;
    if (openWord) say(t('speak.act.entryOpen', { word: w.word }));
  }
</script>

<section class="card trainer" class:compact>
  {#if !compact}<h2>{t('speak.title')}</h2>
  <p class="intro">{t('speak.intro')}</p>{/if}
  {#if !compact}  <div class="tools">
    <button class="tool" class:on={panel === 'chart'} onclick={() => toggle('chart')}>{t('speak.chart')}</button>
    <button class="tool" class:on={panel === 'howto'} onclick={() => toggle('howto')}>{t('speak.howto')}</button>
    <button class="tool" class:on={panel === 'help'} onclick={() => toggle('help')}>{t('speak.help')}</button>
    <button class="tool" class:on={panel === 'use'} onclick={() => toggle('use')}>{t('speak.use')}</button>
    <button class="tool" class:on={panel === 'options'} onclick={() => toggle('options')}>⚙ {t('speak.options')}</button>
  </div>{/if}
  {#if panel === 'use'}
    <div class="help-panel"><div class="prose">{@html t('speak.use.html')}</div><button class="close" onclick={() => (panel = null)}>✕ {t('speak.close')}</button></div>
  {/if}
  {#if panel === 'options'}
    <div class="help-panel options">
      <h4>{t('speak.opt.mic')}</h4>
      <p>{mic ? t(`speak.opt.mic.${mic}`) : t('speak.opt.mic.unknown')} <button onclick={allowMic}>{t('speak.opt.micAllow')}</button></p>
      <h4>{t('speak.opt.models')}</h4>
      <p class="note">{t('speak.opt.modelsNote')}</p>
      <div class="scroll"><table class="models"><tbody>
        <tr><th></th><th>{t('speak.opt.model')}</th><th>MB</th><th>{t('speak.opt.per')}</th><th>{t('speak.opt.licence')}</th><th>{t('speak.opt.cache')}</th><th></th></tr>
        {#each MODELS as m}<tr>
          <td><input type="radio" name="model" checked={modelId === m.id} onchange={() => chooseModel(m.id)} aria-label={m.name} /></td>
          <td><a href={m.source} target="_blank" rel="noopener">{m.name}</a> <small>({m.credit})</small></td><td>{m.mb}</td><td>{m.per}</td><td>{m.license}</td>
          <td>{cached[m.id] ? '✓' : '—'}</td>
          <td>{#if cached[m.id]}<button onclick={() => deleteModel(m)}>🗑 {t('speak.opt.delete')}</button>{:else}<button disabled={!!busy} onclick={() => downloadModel(m)}>⬇ {t('speak.opt.download')}</button>{/if}</td>
        </tr>{/each}
      </tbody></table></div>
      {#if usage != null}<p class="note">{t('speak.opt.usage', { mb: usage })}</p>{/if}
      <p class="note">{t('speak.opt.warn')}</p>
      <button class="close" onclick={() => (panel = null)}>✕ {t('speak.close')}</button>
    </div>
  {/if}
  {#if panel === 'chart' || panel === 'howto'}<IpaChart mode={panel} {samples} play={playSample} {used} onclose={() => (panel = null)} />{/if}
  {#if panel === 'help'}
    <div class="help-panel">
      <div class="prose">{@html t('speak.help.html')}</div>
      <h4>{t('speak.help.prompt')}</h4>
      {#if !heard.length}<p class="note">{t('speak.help.needRec')}</p>{/if}
      <textarea class="prompt" readonly rows="10">{prompt}</textarea>
      <button class="copy" onclick={copyPrompt}>{t('speak.help.copy')}</button>
      {#if wav}<button onclick={downloadWav}>{t('speak.rec.download')}</button>{/if}
      <button class="close" onclick={() => (panel = null)}>✕ {t('speak.close')}</button>
    </div>
  {/if}

  {#if !compact}<textarea class="sentence" lang={lang.bcp47} dir="auto" rows="2" placeholder={t('speak.text.ph', { language: langName })} bind:value={text} oninput={edited}></textarea>{/if}

  {#if expected.length}
    <h3>{t('speak.expected')} {#if voice}<Speaker text={text} {voice} />{/if}</h3>
    <div class="words" dir="ltr">
      {#each expected as w}
        <div class="word {w.source}">
          <div class="w" lang={lang.bcp47}>{w.word}{#if voice}<Speaker text={w.word} {voice} />{/if}<button class="dict-btn" class:on={openWord === w.word} title={t('speak.entry')} onclick={() => toggleEntry(w)}>📖</button></div>
          {#if w.ipa}
            <div class="ipa" title={w.source === 'lemma' ? t('speak.word.lemma', { lemma: w.lemma }) : ''}>{w.source === 'lemma' ? '≈ ' : ''}{w.ipa}</div>
            <div class="sounds">{#each segments(w.ipa) as s}<button class="snd" class:has={!!sampleFor(s, samples)} title={sampleFor(s, samples) ? t('speak.sound.title', { sym: s }) : t('speak.sound.missing', { sym: s })} onclick={() => playSample(s)}>{s}</button>{/each}</div>
            {#if w.source === 'lemma'}<div class="note">{t('speak.word.lemma', { lemma: w.lemma })}</div>{:else if w.source === 'wikt'}<div class="note">{t('speak.word.wikt')}</div>{/if}
          {:else}<div class="note">{t('speak.word.none')}</div>{/if}
        </div>
      {/each}
    </div>
    {#if openWord}<WordEntry word={openWord} {lang} {lookup} {loadInfo} {voice} {loadParadigm} />{/if}
  {/if}

  <div class="rec-row">
    <label>{t('speak.model')}
      <select value={modelId} onchange={(e) => chooseModel(e.currentTarget.value)}>
        {#each MODELS as m}<option value={m.id}>{m.name} · {m.mb} MB · {m.license}{cached[m.id] ? ' ✓' : ''}</option>{/each}
      </select></label>
    <span class="note">{t('speak.model.note', { mb: model.mb })}</span>
  </div>
  <div class="rec-row">
    <button class="rec" class:on={recording} disabled={!!busy && !recording} onclick={toggleRecording}>{recording ? t('speak.rec.stop') : t('speak.rec.start')}</button>
    {#if recording}<span class="time">{recSecs.toFixed(1)} s</span>{/if}
    {#if wav && !recording}<button onclick={playMine}>{t('speak.rec.play')}</button><button onclick={downloadWav}>{t('speak.rec.download')}</button>{/if}
    {#if busy}<span class="busy-line">{busy}</span>{#if pct != null}<progress max="100" value={pct}></progress>{/if}{/if}
  </div>

  {#if heard.length && !pairs.length}
    <h3>{t('speak.heard')}</h3>
    <div class="sounds heard" dir="ltr">{#each heard as h}<button class="snd mine" onclick={() => playSlice(h)}>{h.sym}</button>{/each}</div>
  {/if}

  {#if pairs.length}
    <h3>{t('speak.compare')} {#if result != null}<span class="score">{t('speak.score', { n: result })}</span>{/if}</h3>
    <div class="scroll" dir="ltr"><table class="cmp"><tbody>
      <tr><th>{t('speak.row.expected')}</th>{#each pairs as p}<td class={p.op}>{#if p.exp}<button class="snd" onclick={() => playSample(p.exp)}>{p.exp}</button>{:else}{p.op === 'wild' ? '·' : '—'}{/if}</td>{/each}</tr>
      <tr><th>{t('speak.row.heard')}</th>{#each pairs as p}<td class={p.op}>{#if p.got != null && heard[p.gi]}<button class="snd mine" onclick={() => playSlice(heard[p.gi])}>{p.got}</button>{:else}{p.got ?? '—'}{/if}</td>{/each}</tr>
    </tbody></table></div>
    <p class="note">{t('speak.legend')}</p>
  {/if}
  <p class="credit note">IPA: Wiktionary (CC BY-SA). {t('speak.model')}: {model.name} ({model.credit}, {model.license}), via speech-to-ipa. Samples: Wikimedia Commons (CC0 / CC BY / CC BY-SA).</p>
</section>

<style>
  .trainer h3 { font-size: 1rem; margin: 14px 0 6px; }
  .intro { color: var(--ink-2); }
  .tools { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
  .tool.on { background: var(--accent-soft, var(--panel-hi)); }
  .sentence { width: 100%; box-sizing: border-box; font-size: calc(1.15rem * var(--font-scale, 1)); padding: 8px; margin-top: 8px; }
  .words { display: flex; flex-wrap: wrap; gap: 8px; }
  .word { border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; background: var(--panel-hi); max-width: 100%; }
  .word.none { opacity: .7; } .word.lemma { border-style: dashed; }
  .w { font-weight: 600; }
  .ipa, .snd, .cmp td { font-family: 'Charis SIL', 'Doulos SIL', 'Gentium Plus', 'Noto Sans', serif; }
  .ipa { font-size: 1.05rem; }
  .sounds { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
  .snd { min-width: 30px; min-height: 30px; padding: 0 5px; font-size: 1.05rem; position: relative; }
  .snd.has::after { content: ''; position: absolute; right: 2px; bottom: 2px; width: 5px; height: 5px; border-radius: 50%; background: var(--accent, #3a7); }
  .note { font-size: .8rem; color: var(--muted); margin: 2px 0; }
  .rec-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 10px 0; }
  .rec { font-size: 1.05rem; padding: 6px 16px; }
  .rec.on { background: #c0392b; color: #fff; }
  .busy-line { color: var(--ink-2); }
  .scroll { overflow-x: auto; }
  table.cmp { border-collapse: collapse; }
  .cmp th { text-align: start; padding: 2px 8px 2px 0; font-size: .85em; color: var(--ink-2); white-space: nowrap; }
  .cmp td { border: 1px solid var(--line); text-align: center; padding: 2px; min-width: 32px; }
  .cmp td.ok { background: color-mix(in srgb, #2e9d57 25%, transparent); }
  .cmp td.near { background: color-mix(in srgb, #e0a020 30%, transparent); }
  .cmp td.sub { background: color-mix(in srgb, #d0453a 30%, transparent); }
  .cmp td.del, .cmp td.ins { background: color-mix(in srgb, #d0453a 15%, transparent); }
  .cmp td.wild { color: var(--muted); }
  .cmp .snd { min-height: 26px; min-width: 26px; padding: 0 3px; }
  .score { font-weight: 600; margin-inline-start: 8px; }
  .help-panel { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 12px 16px; margin: 10px 0; }
  .prompt { width: 100%; box-sizing: border-box; font-size: .85rem; }
  .credit { margin-top: 14px; }
  .dict-btn { min-height: 28px; padding: 0 6px; margin-inline-start: 4px; }
  .dict-btn.on { outline: 2px solid var(--accent, #3a7); }
  table.models { border-collapse: collapse; font-size: .9em; }
  .models td, .models th { padding: 3px 6px; border-bottom: 1px solid var(--line); text-align: start; }
</style>
