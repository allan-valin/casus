<script>
  /* Proofreading (Allan, 2026-10-18: a LanguageTool-like checker without the paywall; 2026-10-19: one box that marks
   * mistakes as you type, coloured by kind, explanations beside it, a click on a mark offers the corrections, a
   * corrected version to compare and copy, the same text as the reader, documents can be opened here too).
   * Spelling: Hunspell in the page. Grammar: LanguageTool on this computer first, the public one otherwise. */
  import { onMount } from 'svelte';
  import { t } from '../lib/i18n.svelte.js';
  import { DICTIONARIES, loadSpeller as defaultLoadSpeller, spellIssues } from '../../lib/proof/spell.js';
  import { checkGrammar as defaultCheckGrammar, LT_CODE } from '../../lib/proof/grammar.js';
  import { mergeIssues } from '../../lib/proof/merge.js';
  import { typeOf, corrected, shiftIssues } from '../../lib/proof/correct.js';
  import { layoutIssues } from '../../lib/proof/layout.js';
  import { readTextFile, ACCEPT } from '../lib/upload.js';
  let { lang, storage = null, fetchImpl, say = () => {}, loadSpeller = defaultLoadSpeller, checkGrammar = defaultCheckGrammar, toReader = null,
    schedule = (fn, ms) => setTimeout(fn, ms), cancel = (id) => clearTimeout(id),
    copy = (s) => navigator.clipboard?.writeText(s), knownWords = null } = $props();

  // the same text as the reader's box (PassagePicker keeps it under this key), mirrored both ways
  const KEY = `casus:input:${lang.code}`;
  const TYPES = ['spelling', 'grammar', 'punctuation', 'style', 'casing'];
  let text = $state('');
  let issues = $state([]);
  let busy = $state(false);
  let grammarEngine = $state(null);
  let allowPublic = $state(true);
  let auto = $state(true);
  let comparing = $state(false);
  let menu = $state(null);
  let backdrop = $state(null);
  let speller = null;
  let timer = null;
  let seq = 0;
  let last = '';
  const ignored = new Set();
  const hasSpell = !!DICTIONARIES[lang.code];
  const hasGrammar = !!LT_CODE[lang.code];
  const keyOf = (i) => `${i.rule ?? i.word ?? ''}:${text.slice(i.offset, i.offset + i.length)}`;

  function get(k) { try { return storage?.getItem(k) ?? null; } catch { return null; } }
  function put(k, v) { try { storage?.setItem(k, v); } catch { /* full or blocked */ } }

  onMount(() => {
    text = get(KEY) ?? '';
    last = text;
    allowPublic = get('casus:proof:public') !== 'off';
    auto = get('casus:proof:auto') !== 'off';
    if (auto && text.trim()) check();
    const onStorage = (e) => { if (e.key === KEY && e.newValue !== null && e.newValue !== text) { text = e.newValue; last = text; issues = []; if (auto) later(); } };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  });

  function later() {
    if (timer !== null) cancel(timer);
    // a pause after typing; longer when the public service answers (about 20 checks a minute)
    timer = schedule(() => { timer = null; check(); }, grammarEngine === 'public' ? 2000 : 700);
  }

  function edited(next) {
    issues = shiftIssues(last, next, issues);
    last = next;
    put(KEY, next);
    if (auto) later();
  }

  // a word Hunspell rejects but the reader's dictionary knows (Wiktionary: names, loans, compounds) is no mistake; a
  // hyphenated word passes when each part is known to either (Allan, 2026-10-19: German compounds)
  async function notInReader(found) {
    if (!knownWords || !found.length) return found;
    const parts = (w) => w.split(/[-‐]/).filter(Boolean);
    const words = [...new Set(found.flatMap((i) => [i.word, ...parts(i.word)]))];
    const known = await knownWords(words);
    const ok = (w) => known.has(w) || speller.correct(w) || speller.correct(w.toLowerCase());
    return found.filter((i) => !(known.has(i.word) || (i.word.includes('-') && parts(i.word).every(ok))));
  }

  async function check() {
    const snapshot = text;
    if (!snapshot.trim()) { issues = []; return; }
    const mine = ++seq;
    busy = true;
    try {
      const [sp, gr] = await Promise.all([
        hasSpell ? (async () => { speller ??= await loadSpeller(lang.code, fetchImpl); return notInReader(spellIssues(snapshot, speller, { suggest: true })); })().catch((e) => { say('act.proof.spellFailed', { error: e.message }); return []; }) : [],
        hasGrammar ? checkGrammar(snapshot, lang.code, { fetchImpl, allowPublic }).catch((e) => { say('act.proof.grammarFailed', { error: e.message }); return { engine: null, issues: [] }; }) : { engine: null, issues: [] },
      ]);
      if (mine !== seq) return;                         // a newer check is on its way
      grammarEngine = gr.engine;
      // sentence ends the grammar engine does not see: a line break, a paragraph without its full stop (Allan, 2026-10-22)
      // the engine read across those line breaks as one sentence (it suggested a comma there): its marks spanning a
      // sentence end we found go; where it marks the same word on its own, its mark wins
      const lines = layoutIssues(snapshot, { code: lang.code, messages: { period: t('proof.layout.period'), capital: t('proof.layout.capital') } });
      const ends = lines.filter((l) => l.rule === 'CASUS_LINE_END').map((l) => l.offset + l.length);
      const engine = gr.issues.filter((g) => !ends.some((e) => g.offset < e && g.offset + g.length > e));
      const own = lines.filter((l) => !engine.some((g) => l.offset < g.offset + g.length && g.offset < l.offset + l.length));
      const found = mergeIssues(sp, [...engine, ...own].sort((a, b) => a.offset - b.offset)).map((i) => ({ ...i, type: typeOf(i) }));
      // typed on meanwhile: place the marks in the new text
      issues = (text === snapshot ? found : shiftIssues(snapshot, text, found)).filter((i) => !ignored.has(`${i.rule ?? i.word ?? ''}:${text.slice(i.offset, i.offset + i.length)}`));
      say('act.proof.done', { n: issues.length });
    } finally { if (mine === seq) busy = false; }
  }

  function apply(issue, replacement) {
    const next = text.slice(0, issue.offset) + replacement + text.slice(issue.offset + issue.length);
    issues = shiftIssues(text, next, issues.filter((i) => i !== issue));
    text = next;
    last = next;
    put(KEY, next);
    menu = null;
    say('act.proof.applied', { to: replacement });
    if (auto) later();
  }
  function ignore(issue) { ignored.add(keyOf(issue)); issues = issues.filter((i) => i !== issue); menu = null; }

  const fixed = $derived(corrected(text, issues));
  function applyAll() {
    text = fixed.text;
    last = text;
    issues = [];
    put(KEY, text);
    say('act.proof.appliedAll');
    if (auto) later();
  }

  function clickText(e) {
    const at = e.currentTarget.selectionStart;
    const hit = issues.find((i) => at >= i.offset && at <= i.offset + i.length);
    menu = hit ? { issue: hit, x: e.clientX, y: e.clientY } : null;
  }

  async function upload(e) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const got = (await readTextFile(file)).trim();
      if (got) { text = got; last = got; issues = []; put(KEY, got); check(); }
    } catch (err) { say('act.uploadFailed', { error: err.message }); }
    try { input.value = ''; } catch { /* test stub */ }
  }

  // the text cut into plain stretches and marked ones (marks never overlap)
  function piecesOf(source, list) {
    const out = [];
    let at = 0;
    for (const i of [...list].sort((a, b) => a.offset - b.offset)) {
      if (i.offset < at) continue;
      if (i.offset > at) out.push({ text: source.slice(at, i.offset) });
      out.push({ text: source.slice(i.offset, i.offset + i.length), issue: i });
      at = i.offset + i.length;
    }
    out.push({ text: source.slice(at) });
    return out;
  }
  const pieces = $derived(piecesOf(text, issues));
  const afterPieces = $derived(piecesOf(fixed.text, fixed.changes.map((c) => ({ ...c, change: true }))));
</script>

<section class="card proof">
  <h2>{t('proof.heading')}</h2>
  <p class="engines">
    {#if hasSpell}{t('proof.spell', { name: DICTIONARIES[lang.code][0] })}{:else}{t('proof.noSpell')}{/if} ·
    {#if !hasGrammar}{t('proof.noGrammar')}{:else if grammarEngine === 'local'}{t('proof.grammar.local')}{:else if grammarEngine === 'public'}{t('proof.grammar.public')}{:else}{t('proof.grammar.ready')}{/if}
  </p>
  <div class="bar">
    <label title={t('proof.auto.title')}><input type="checkbox" class="auto" bind:checked={auto} onchange={() => { put('casus:proof:auto', auto ? 'on' : 'off'); if (auto) check(); }}> {t('proof.auto')}</label>
    {#if !auto}<button class="check primary" onclick={check} disabled={busy || !text.trim()}>{busy ? t('proof.checking') : t('proof.check')}</button>{/if}
    {#if busy && auto}<span class="busy">{t('proof.checking')}</span>{/if}
    <label class="upload" title={t('picker.upload.title')}>{t('picker.upload')}<input type="file" accept={ACCEPT} onchange={upload}></label>
    {#if hasGrammar}<label title={t('proof.public.title')}><input type="checkbox" bind:checked={allowPublic} onchange={() => put('casus:proof:public', allowPublic ? 'on' : 'off')}> {t('proof.public')}</label>{/if}
  </div>
  <!-- the colour key, said as one, with how many of each (Allan, 2026-10-22: "what is that row supposed to be?") -->
  <div class="legend" aria-label={t('proof.legend')}><span class="legend-label">{t('proof.legend.label')}</span>{#each TYPES as ty}<span class="key" data-type={ty}><i></i>{t(`proof.type.${ty}`)} <span class="n">{issues.filter((i) => i.type === ty).length}</span></span>{/each}</div>

  <div class="grid">
    <div class="left">
      <div class="editor">
        <div class="backdrop" aria-hidden="true" bind:this={backdrop}>{#each pieces as p}{#if p.issue}<mark data-type={p.issue.type}>{p.text}</mark>{:else}{p.text}{/if}{/each}{'\n'}</div>
        <textarea dir="auto" spellcheck="false" bind:value={text} placeholder={t('proof.placeholder')}
          oninput={(e) => edited(e.currentTarget.value)} onclick={clickText} onscroll={(e) => { if (backdrop) backdrop.scrollTop = e.currentTarget.scrollTop; }}></textarea>
      </div>
      <div class="bar">
        <button class="compare" onclick={() => { comparing = !comparing; }} aria-pressed={comparing}>{comparing ? t('proof.compare.hide') : t('proof.compare')}</button>
        <button class="copy" onclick={() => { copy(fixed.text); say('act.proof.copied'); }} disabled={!text.trim()}>{t('proof.copy')}</button>
        <button class="apply-all" onclick={applyAll} disabled={!fixed.changes.length}>{t('proof.applyAll')}</button>
        {#if toReader}<button class="to-reader" onclick={() => toReader(text)}>{t('proof.toReader')}</button>{/if}
      </div>
      {#if comparing}
        <div class="compare-view">
          <div><h3>{t('proof.before')}</h3><div class="before">{#each pieces as p}{#if p.issue}<mark data-type={p.issue.type}>{p.text}</mark>{:else}{p.text}{/if}{/each}</div></div>
          <div><h3>{t('proof.after')}</h3><div class="after">{#each afterPieces as p}{#if p.issue}<ins>{p.text}</ins>{:else}{p.text}{/if}{/each}</div></div>
        </div>
      {/if}
    </div>
    <aside class="explain" aria-label={t('proof.explain')}>
      {#if text.trim() && !busy && issues.length === 0}<p class="clean">{t('proof.clean')}</p>{/if}
      {#each issues as i (i.offset + ':' + i.type + ':' + (i.rule ?? i.word))}
        <div class="issue" data-type={i.type}>
          <span class="tag">{t(`proof.type.${i.type}`)}</span> <q>{text.slice(i.offset, i.offset + i.length)}</q>
          <div class="msg">{i.kind === 'spelling' ? t('proof.misspelt') : i.message}</div>
          <div class="fixes">{#each i.replacements as r}<button class="fix" onclick={() => apply(i, r)}>{r}</button>{/each}<button class="ignore" onclick={() => ignore(i)}>{t('proof.ignore')}</button></div>
        </div>
      {/each}
    </aside>
  </div>

  {#if menu}
    <div class="fixmenu" role="menu" style:left={`${menu.x}px`} style:top={`${menu.y + 14}px`}>
      <div class="msg">{menu.issue.kind === 'spelling' ? t('proof.misspelt') : menu.issue.message}</div>
      {#each menu.issue.replacements as r}<button class="fix" role="menuitem" onclick={() => apply(menu.issue, r)}>{r}</button>{/each}
      <button class="ignore" role="menuitem" onclick={() => ignore(menu.issue)}>{t('proof.ignore')}</button>
      <button class="close" aria-label="close" onclick={() => { menu = null; }}>×</button>
    </div>
  {/if}

  {#if hasGrammar && grammarEngine !== 'local'}
    <details class="local"><summary>{t('proof.local.heading')}</summary><p>{t('proof.local.body')}</p><pre>bash tools/languagetool.sh</pre></details>
  {/if}
</section>

<style>
  .proof { --c-spelling: #d62728; --c-grammar: #1f77b4; --c-punctuation: #ff7f0e; --c-style: #9467bd; --c-casing: #17a398; }
  .engines { color: var(--ink-2); font-size: 0.9em; margin: 0 0 6px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; margin: 6px 0; }
  .legend { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; font-size: 0.85em; color: var(--ink-2); margin-bottom: 6px; }
  .legend-label { font-weight: 700; }
  .legend .n { display: inline-block; min-width: 1.4em; padding: 0 5px; border-radius: 999px; background: var(--line); color: var(--ink); text-align: center; font-variant-numeric: tabular-nums; }
  .key i { display: inline-block; width: 18px; height: 0; border-bottom: 3px wavy currentColor; margin-right: 5px; vertical-align: middle; }
  .key[data-type=spelling] i, .issue[data-type=spelling] .tag { color: var(--c-spelling); border-color: var(--c-spelling); }
  .key[data-type=grammar] i, .issue[data-type=grammar] .tag { color: var(--c-grammar); border-color: var(--c-grammar); }
  .key[data-type=punctuation] i, .issue[data-type=punctuation] .tag { color: var(--c-punctuation); border-color: var(--c-punctuation); }
  .key[data-type=style] i, .issue[data-type=style] .tag { color: var(--c-style); border-color: var(--c-style); }
  .key[data-type=casing] i, .issue[data-type=casing] .tag { color: var(--c-casing); border-color: var(--c-casing); }
  .grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 14px; align-items: start; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  /* the marks are drawn on a copy of the text under a transparent text box, so they sit under what is typed */
  .editor { position: relative; }
  .backdrop, textarea { box-sizing: border-box; width: 100%; height: clamp(220px, 45vh, 520px); margin: 0; padding: 10px; border: 1px solid var(--line);
    border-radius: 8px; font: inherit; font-size: var(--text-size); line-height: 1.7; letter-spacing: normal; white-space: pre-wrap; overflow-wrap: break-word; overflow-y: auto; }
  .backdrop { position: absolute; inset: 0; color: transparent; background: var(--panel); pointer-events: none; border-color: transparent; scrollbar-width: none; }
  textarea { position: relative; background: transparent; color: var(--ink); resize: vertical; caret-color: var(--ink); }
  mark { background: none; color: transparent; text-decoration: underline wavy; text-decoration-thickness: 2px; text-underline-offset: 4px; }
  mark[data-type=spelling] { text-decoration-color: var(--c-spelling); background: color-mix(in srgb, var(--c-spelling) 10%, transparent); }
  mark[data-type=grammar] { text-decoration-color: var(--c-grammar); background: color-mix(in srgb, var(--c-grammar) 10%, transparent); }
  mark[data-type=punctuation] { text-decoration-color: var(--c-punctuation); background: color-mix(in srgb, var(--c-punctuation) 12%, transparent); }
  mark[data-type=style] { text-decoration-color: var(--c-style); background: color-mix(in srgb, var(--c-style) 10%, transparent); }
  mark[data-type=casing] { text-decoration-color: var(--c-casing); background: color-mix(in srgb, var(--c-casing) 10%, transparent); }
  .compare-view mark { color: var(--ink); }
  .explain { display: flex; flex-direction: column; gap: 8px; max-height: clamp(220px, 60vh, 640px); overflow-y: auto; }
  .issue { border: 1px solid var(--line-soft); border-left: 4px solid var(--line); border-radius: 6px; padding: 6px 8px; background: var(--panel); }
  .issue[data-type=spelling] { border-left-color: var(--c-spelling); } .issue[data-type=grammar] { border-left-color: var(--c-grammar); }
  .issue[data-type=punctuation] { border-left-color: var(--c-punctuation); } .issue[data-type=style] { border-left-color: var(--c-style); }
  .issue[data-type=casing] { border-left-color: var(--c-casing); }
  .tag { font-size: 0.78em; padding: 0 6px; border: 1px solid; border-radius: 6px; }
  .msg { color: var(--ink-2); font-size: 0.92em; margin: 2px 0 4px; }
  .fixes { display: flex; flex-wrap: wrap; gap: 4px; }
  button { font: inherit; padding: 5px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); cursor: pointer; }
  button.primary { border-color: var(--accent); font-weight: 600; }
  .fix { padding: 2px 10px; border-color: var(--accent); font-weight: 600; }
  .ignore { padding: 2px 10px; color: var(--ink-2); }
  .upload { display: inline-flex; align-items: center; padding: 5px 12px; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; position: relative; }
  .upload input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .busy { color: var(--ink-2); font-size: 0.9em; }
  .clean { color: #2e8b57; font-weight: 600; }
  .compare-view { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
  @media (max-width: 700px) { .compare-view { grid-template-columns: 1fr; } }
  .compare-view h3 { margin: 0 0 4px; font-size: 0.95em; color: var(--ink-2); }
  .before, .after { white-space: pre-wrap; padding: 8px; border: 1px solid var(--line-soft); border-radius: 8px; background: var(--panel-hi); line-height: 1.7; }
  ins { text-decoration: none; background: color-mix(in srgb, #2e8b57 22%, transparent); border-radius: 3px; }
  .fixmenu { position: fixed; z-index: 50; max-width: min(360px, 90vw); background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 8px;
    box-shadow: 0 6px 20px rgba(0,0,0,.2); display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .fixmenu .msg { flex-basis: 100%; }
  .close { margin-left: auto; padding: 0 8px; }
  .local { margin-top: 10px; color: var(--ink-2); font-size: 0.92em; }
  pre { background: var(--panel-hi); padding: 6px 10px; border-radius: 6px; overflow-x: auto; }
</style>
